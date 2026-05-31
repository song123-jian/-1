<template>
  <div class="dashboard-page">
    <div v-if="isLoading" class="skeleton-wrapper">
      <div class="skeleton-row-4">
        <div class="skeleton skeleton-card"></div>
        <div class="skeleton skeleton-card"></div>
        <div class="skeleton skeleton-card"></div>
        <div class="skeleton skeleton-card"></div>
      </div>
      <div class="skeleton-row-2">
        <div class="skeleton" style="height:300px"></div>
        <div class="skeleton" style="height:300px"></div>
      </div>
    </div>

    <div v-else>
    <div class="page-header">
      <div>
        <h2 class="page-header-title">仪表盘</h2>
        <p class="page-header-subtitle">实时业务概览与关键指标监控</p>
      </div>
    </div>

    <div class="dashboard-toolbar">
      <span class="toolbar-label">数据范围</span>
      <div class="btn-group">
        <button
          v-for="r in dateRanges"
          :key="r.key"
          class="btn btn-ghost"
          :class="{ active: selectedRange === r.key }"
          @click="selectedRange = r.key"
        >{{ r.label }}</button>
      </div>
      <button class="btn btn-ghost" @click="refreshData">🔄 刷新</button>
    </div>

    <div class="dash-highlight-grid stats-grid-4">
      <div class="dash-stat-card" style="--card-color: var(--color-accent)">
        <div class="dash-stat-label">本月营收</div>
        <div class="dash-stat-value" style="color: var(--color-accent)">¥{{ formatNumber(totalRevenue) }}</div>
        <div class="dash-stat-sub">
          <span :style="{ color: revenueGrowth >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }">
            {{ revenueGrowth >= 0 ? '↑' : '↓' }} {{ Math.abs(revenueGrowth) }}%
          </span>
          较上月
        </div>
      </div>
      <div class="dash-stat-card" style="--card-color: var(--color-success)">
        <div class="dash-stat-label">回款率</div>
        <div class="dash-stat-value" style="color: var(--color-success)">{{ collectionRate }}%</div>
        <div class="dash-stat-sub">本月回款: ¥{{ formatNumber(monthCollected) }}</div>
      </div>
      <div class="dash-stat-card" style="--card-color: var(--color-warning)">
        <div class="dash-stat-label">待处理</div>
        <div class="dash-stat-value" style="color: var(--color-warning)">
          {{ quotationStore.pendingCount }} 报价 / {{ contractStore.pendingApprovalCount }} 合同
        </div>
      </div>
      <div class="dash-stat-card" style="--card-color: var(--color-danger)">
        <div class="dash-stat-label">预警</div>
        <div class="dash-stat-value" style="color: var(--color-danger)">
          {{ inventoryStore.lowStockCount + inventoryStore.exhaustedCount }} 低库存 / {{ todoStore.stats.overdue }} 逾期
        </div>
      </div>
    </div>

    <div class="stats-row stats-grid-7">
      <div class="stat-card" v-for="stat in statCards" :key="stat.label">
        <div class="stat-card-header">
          <div class="stat-card-icon" :style="{ background: stat.bgColor, color: stat.color }">{{ stat.icon }}</div>
        </div>
        <div class="stat-card-value">{{ stat.value }}</div>
        <div class="stat-card-label">{{ stat.label }}</div>
        <div class="stat-card-change" :style="{ color: stat.changeColor || 'var(--color-text-tertiary)' }">{{ stat.change }}</div>
      </div>
    </div>

    <div class="week-view-section">
      <div class="week-view-header">
        <span class="panel-card-title">📅 周视图</span>
        <div class="week-view-nav">
          <button class="dp-nav-btn" @click="weekPrev">◀ 上一周</button>
          <button class="dp-today-btn" @click="weekGoToday">本周</button>
          <button class="dp-nav-btn" @click="weekNext">下一周 ▶</button>
          <span class="week-view-range">{{ weekRangeLabel }}</span>
        </div>
      </div>
      <div class="week-view-grid">
        <div
          v-for="day in weekDays"
          :key="day.date"
          class="week-day-col"
          :class="{ today: day.isToday, selected: day.date === dpSelectedDate }"
          @click="dpSelectDate(day.date)"
        >
          <div class="week-day-header">
            <div class="week-day-name">{{ day.weekday }}</div>
            <div class="week-day-num" :class="{ 'is-today': day.isToday }">{{ day.dayNum }}</div>
          </div>
          <div class="week-day-todos">
            <div
              v-for="todo in day.todos"
              :key="todo.id"
              class="week-todo-item"
              :class="[
                'priority-' + todo.priority,
                { completed: todo.status === 'completed', overdue: isOverdue(todo) }
              ]"
              @click.stop="todoStore.toggleTodo(todo.id, todo.auto || false)"
            >
              <span class="week-todo-dot"></span>
              <span class="week-todo-title">{{ todo.title }}</span>
            </div>
            <div v-if="day.todos.length === 0" class="week-day-empty">-</div>
          </div>
          <div v-if="day.todos.length > 0" class="week-day-count">{{ day.todos.length }}项</div>
        </div>
      </div>
    </div>

    <div class="content-grid content-grid-2">
      <div class="panel-card">
        <div class="panel-card-header">
          <span class="panel-card-title">📈 销售/回款趋势（近12月）</span>
          <select class="form-select" style="width:auto;min-width:100px" v-model="chartMode">
            <option value="monthly">按月</option>
            <option value="quarterly">按季</option>
            <option value="yearly">按年</option>
          </select>
        </div>
        <div class="panel-card-body">
          <div class="chart-container">
            <canvas ref="salesChartRef"></canvas>
          </div>
        </div>
      </div>

      <div class="panel-card">
        <div class="panel-card-header">
          <span class="panel-card-title">📊 库存分布</span>
        </div>
        <div class="panel-card-body">
          <div class="chart-container">
            <canvas ref="inventoryChartRef"></canvas>
          </div>
        </div>
      </div>
    </div>

    <div class="content-grid content-grid-2">
      <div class="panel-card">
        <div class="panel-card-header">
          <span class="panel-card-title">⚠️ 预警中心</span>
          <button class="btn btn-ghost btn-sm" @click="$router.push('/inventory')">查看全部</button>
        </div>
        <div class="panel-card-body">
          <div class="alert-list">
            <div
              v-for="alert in alerts"
              :key="alert.id"
              class="alert-item"
              :class="'alert-' + alert.level"
            >
              <span class="alert-icon">{{ alert.level === 'danger' ? '🔴' : alert.level === 'warning' ? '🟡' : '🔵' }}</span>
              <div class="alert-content">
                <div class="alert-title">{{ alert.title }}</div>
                <div class="alert-desc">{{ alert.desc }}</div>
              </div>
              <span class="alert-time">{{ alert.time }}</span>
            </div>
            <div v-if="alerts.length === 0" class="alert-empty">暂无预警信息 ✅</div>
          </div>
        </div>
      </div>

      <div class="panel-card">
        <div class="panel-card-header">
          <span class="panel-card-title">🕐 最近活动</span>
        </div>
        <div class="panel-card-body">
          <div class="timeline">
            <div v-for="activity in recentActivities" :key="activity.id" class="timeline-item">
              <div class="timeline-dot" :style="{ background: activity.color }"></div>
              <div class="timeline-content">
                <div class="timeline-text">{{ activity.text }}</div>
                <div class="timeline-time">{{ activity.time }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="content-grid content-grid-2">
      <div class="panel-card">
        <div class="panel-card-header">
          <span class="panel-card-title">💰 回款趋势（近6月）</span>
        </div>
        <div class="panel-card-body">
          <div class="chart-container">
            <canvas ref="collectionTrendChartRef"></canvas>
          </div>
        </div>
      </div>

      <div class="panel-card">
        <div class="panel-card-header">
          <span class="panel-card-title">🏆 客户贡献 TOP5</span>
        </div>
        <div class="panel-card-body">
          <div class="top-customers">
            <div v-for="(customer, idx) in topCustomers" :key="customer.id" class="top-customer-item">
              <div class="top-rank" :class="'rank-' + (idx + 1)">{{ idx + 1 }}</div>
              <div class="top-info">
                <div class="top-name">{{ customer.name }}</div>
                <div class="top-bar-container">
                  <div class="top-bar" :style="{ width: customer.percentage + '%' }"></div>
                </div>
              </div>
              <div class="top-amount">¥{{ formatNumber(customer.balance) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="content-grid content-grid-2">
      <div class="panel-card">
        <div class="panel-card-header">
          <span class="panel-card-title">⚡ 快速操作</span>
        </div>
        <div class="panel-card-body">
          <div class="quick-actions">
            <div class="quick-action-card" @click="$router.push('/quotations')">
              <div class="quick-action-icon">📝</div>
              <div class="quick-action-label">新建报价</div>
            </div>
            <div class="quick-action-card" @click="$router.push('/contracts')">
              <div class="quick-action-icon">📄</div>
              <div class="quick-action-label">新建合同</div>
            </div>
            <div class="quick-action-card" @click="$router.push('/customers')">
              <div class="quick-action-icon">🏢</div>
              <div class="quick-action-label">新建客户</div>
            </div>
            <div class="quick-action-card" @click="$router.push('/inventory?tab=inbound')">
              <div class="quick-action-icon">📥</div>
              <div class="quick-action-label">入库登记</div>
            </div>
            <div class="quick-action-card" @click="$router.push('/collections')">
              <div class="quick-action-icon">💰</div>
              <div class="quick-action-label">记录回款</div>
            </div>
            <div class="quick-action-card" @click="$router.push('/deliveries')">
              <div class="quick-action-icon">🚚</div>
              <div class="quick-action-label">创建送货单</div>
            </div>
            <div class="quick-action-card" @click="$router.push('/reports')">
              <div class="quick-action-icon">📈</div>
              <div class="quick-action-label">查看报表</div>
            </div>
          </div>
        </div>
      </div>

      <div class="panel-card ai-insight-panel">
        <div class="panel-card-header">
          <span class="panel-card-title"><span class="ai-icon">AI</span> AI 智能分析</span>
          <button class="btn btn-ghost" @click="refreshInsights">🔄 刷新</button>
        </div>
        <div class="panel-card-body">
          <div v-if="isRefreshingInsights" class="ai-loading">🔄 正在分析中...</div>
          <template v-else>
          <div class="ai-summary">{{ aiSummary }}</div>
          <div class="ai-insights">
            <div v-for="(insight, idx) in aiInsights" :key="idx" class="ai-insight-item">
              <span class="ai-insight-icon">{{ insight.icon }}</span>
              <div class="ai-insight-text">{{ insight.text }}</div>
            </div>
          </div>
          </template>
        </div>
      </div>
    </div>

    <div class="date-todo-section">
      <div class="date-picker-container">
        <div class="date-picker-header">
          <div class="dp-header-left">
            <span class="dp-icon">📅</span>
            <div class="dp-year-month-selectors">
              <select class="dp-year-select" v-model="dpYear">
                <option v-for="y in dpYears" :key="y" :value="y">{{ y }}年</option>
              </select>
              <select class="dp-month-select" v-model="dpMonth">
                <option v-for="m in 12" :key="m" :value="m">{{ m }}月</option>
              </select>
            </div>
          </div>
          <div class="date-picker-nav">
            <button @click="dpPrevYear" title="上一年" class="dp-nav-btn">«</button>
            <button @click="dpPrevMonth" title="上一月" class="dp-nav-btn">◀</button>
            <button class="dp-today-btn" @click="dpGoToday">今天</button>
            <button @click="dpNextMonth" title="下一月" class="dp-nav-btn">▶</button>
            <button @click="dpNextYear" title="下一年" class="dp-nav-btn">»</button>
          </div>
        </div>
        <div class="dp-manual-input-row">
          <label class="dp-input-label">手动输入：</label>
          <input type="date" class="dp-manual-input" v-model="dpManualDate">
          <button class="btn btn-ghost btn-sm dp-apply-btn" @click="dpApplyManual">应用</button>
        </div>
        <div class="date-picker-body">
          <div class="date-picker-weekdays">
            <div class="date-picker-weekday" v-for="d in ['日','一','二','三','四','五','六']" :key="d">{{ d }}</div>
          </div>
          <div class="date-picker-days">
            <div
              v-for="day in dpDays"
              :key="day.key"
              class="dp-day"
              :class="[
                { 'other-month': !day.currentMonth },
                { today: day.isToday },
                { selected: day.date === dpSelectedDate },
                { 'has-todo': day.todoCount > 0 }
              ]"
              @click="dpSelectDate(day.date)"
            >
              {{ day.day }}
              <span v-if="day.todoCount > 0" class="dp-day-dot"></span>
            </div>
          </div>
        </div>
        <div class="date-picker-footer">
          <div class="dp-selected-info">
            <span>已选择：{{ dpSelectedDate || '今天' }}</span>
            <span class="dp-weekday-label">{{ dpSelectedWeekday }}</span>
          </div>
          <span class="dp-task-count">{{ dpSelectedTodoCount }} 项待办</span>
        </div>
      </div>

      <div class="panel-card todo-panel-wrapper">
        <div class="panel-card-header">
          <span class="panel-card-title">📋 待办事项</span>
          <div style="display:flex;gap:var(--space-2);align-items:center;flex-wrap:wrap">
            <div class="todo-view-toggle">
              <button
                v-for="v in todoViewModes"
                :key="v.key"
                class="todo-view-btn"
                :class="{ active: todoViewMode === v.key }"
                @click="todoViewMode = v.key"
              >{{ v.icon }} {{ v.label }}</button>
            </div>
            <span class="dp-date-label">{{ dpSelectedDate || '今天' }}</span>
            <div class="todo-filters">
              <button
                v-for="f in todoFilterOptions"
                :key="f.key"
                class="todo-filter-btn"
                :class="{ active: todoFilter === f.key }"
                @click="todoFilter = f.key"
              >{{ f.label }}</button>
            </div>
            <button class="btn btn-primary btn-sm" @click="showTodoForm = !showTodoForm">{{ showTodoForm ? '取消' : '+ 新建' }}</button>
          </div>
        </div>
        <div class="panel-card-body">
          <div v-if="showTodoForm" class="todo-add-form">
            <input type="text" v-model="newTodoTitle" placeholder="输入待办事项..." @keydown.enter="addNewTodo">
            <select v-model="newTodoPriority">
              <option value="medium">中</option>
              <option value="high">高</option>
              <option value="low">低</option>
            </select>
            <input type="date" v-model="newTodoDue">
            <button class="btn btn-primary btn-sm" @click="addNewTodo">添加</button>
            <button class="btn btn-ghost btn-sm" @click="showTodoForm = false">取消</button>
          </div>
          <div class="todo-toolbar">
            <div class="todo-priority-filters">
              <div class="todo-priority-btn p-all" :class="{ active: todoPriorityFilter === 'all' }" @click="todoPriorityFilter = 'all'" title="全部优先级"></div>
              <div class="todo-priority-btn p-high" :class="{ active: todoPriorityFilter === 'high' }" @click="todoPriorityFilter = 'high'" title="高优先级"></div>
              <div class="todo-priority-btn p-medium" :class="{ active: todoPriorityFilter === 'medium' }" @click="todoPriorityFilter = 'medium'" title="中优先级"></div>
              <div class="todo-priority-btn p-low" :class="{ active: todoPriorityFilter === 'low' }" @click="todoPriorityFilter = 'low'" title="低优先级"></div>
            </div>
            <div class="todo-toolbar-right">
              <button class="btn btn-ghost btn-sm" @click="completeAllTodos">✅ 全部完成</button>
              <button class="btn btn-ghost btn-sm" @click="clearCompletedTodos">🗑 清除已完成</button>
            </div>
          </div>

          <!-- 📊 表格视图 -->
          <div v-if="todoViewMode === 'table'" class="todo-table-view">
            <table class="todo-table">
              <thead>
                <tr>
                  <th>状态</th>
                  <th>待办事项</th>
                  <th>优先级</th>
                  <th>截止日期</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="todo in filteredDpTodos" :key="todo.id" :class="{ completed: todo.status === 'completed', overdue: isOverdue(todo) }">
                  <td>
                    <button class="todo-check" @click="todoStore.toggleTodo(todo.id, todo.auto || false)">
                      {{ todo.status === 'completed' ? '✅' : '⬜' }}
                    </button>
                  </td>
                  <td class="todo-table-title">{{ todo.title }}</td>
                  <td><span class="todo-priority" :class="'priority-' + todo.priority">{{ todo.priority === 'high' ? '高' : todo.priority === 'medium' ? '中' : '低' }}</span></td>
                  <td><span class="todo-due" :class="{ overdue: isOverdue(todo) }">{{ todo.dueDate || '-' }}</span></td>
                  <td>
                    <button class="btn btn-ghost btn-sm" @click="todoStore.deleteTodo(todo.id)">🗑</button>
                  </td>
                </tr>
                <tr v-if="filteredDpTodos.length === 0">
                  <td colspan="5" class="todo-empty">暂无待办事项 ✅</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 📋 列表视图（默认） -->
          <div v-if="todoViewMode === 'list'" class="todo-list">
            <div
              v-for="todo in filteredDpTodos"
              :key="todo.id"
              class="todo-quick-item"
              :class="{ completed: todo.status === 'completed', overdue: isOverdue(todo) }"
            >
              <button class="todo-check" @click="todoStore.toggleTodo(todo.id, todo.auto || false)">
                {{ todo.status === 'completed' ? '✅' : '⬜' }}
              </button>
              <div class="todo-info">
                <span class="todo-title">{{ todo.title }}</span>
                <span class="todo-due" :class="{ overdue: isOverdue(todo) }">{{ todo.dueDate }}</span>
              </div>
              <span class="todo-priority" :class="'priority-' + todo.priority">
                {{ todo.priority === 'high' ? '高' : todo.priority === 'medium' ? '中' : '低' }}
              </span>
            </div>
            <div v-if="filteredDpTodos.length === 0" class="todo-empty">暂无待办事项 ✅</div>
          </div>

          <!-- 🗂 卡片视图 -->
          <div v-if="todoViewMode === 'card'" class="todo-card-view">
            <div
              v-for="todo in filteredDpTodos"
              :key="todo.id"
              class="todo-card-item"
              :class="[
                'priority-border-' + todo.priority,
                { completed: todo.status === 'completed', overdue: isOverdue(todo) }
              ]"
            >
              <div class="todo-card-top">
                <button class="todo-check" @click="todoStore.toggleTodo(todo.id, todo.auto || false)">
                  {{ todo.status === 'completed' ? '✅' : '⬜' }}
                </button>
                <span class="todo-priority" :class="'priority-' + todo.priority">
                  {{ todo.priority === 'high' ? '高' : todo.priority === 'medium' ? '中' : '低' }}
                </span>
              </div>
              <div class="todo-card-title">{{ todo.title }}</div>
              <div class="todo-card-meta">
                <span class="todo-due" :class="{ overdue: isOverdue(todo) }">📅 {{ todo.dueDate || '无截止日期' }}</span>
                <button class="btn btn-ghost btn-sm" @click="todoStore.deleteTodo(todo.id)" style="padding:0 4px;font-size:12px">🗑 删除</button>
              </div>
            </div>
            <div v-if="filteredDpTodos.length === 0" class="todo-empty">暂无待办事项 ✅</div>
          </div>

          <!-- 📅 日历视图 -->
          <div v-if="todoViewMode === 'calendar'" class="todo-calendar-view">
            <div class="todo-cal-nav">
              <button class="dp-nav-btn" @click="todoCalPrevYear">«</button>
              <button class="dp-nav-btn" @click="todoCalPrevMonth">◀</button>
              <button class="dp-today-btn" @click="todoCalGoToday">今天</button>
              <button class="dp-nav-btn" @click="todoCalNextMonth">▶</button>
              <button class="dp-nav-btn" @click="todoCalNextYear">»</button>
              <span class="todo-cal-label">{{ todoCalYear }}年{{ todoCalMonth }}月</span>
            </div>
            <div class="todo-cal-weekdays">
              <div v-for="d in ['日','一','二','三','四','五','六']" :key="d" class="todo-cal-weekday">{{ d }}</div>
            </div>
            <div class="todo-cal-days">
              <div
                v-for="day in todoCalDays"
                :key="day.key"
                class="todo-cal-day"
                :class="{ 'other-month': !day.currentMonth, today: day.isToday, selected: day.date === todoCalSelectedDate }"
                @click="todoCalSelectDate(day.date)"
              >
                <div class="todo-cal-day-num">{{ day.day }}</div>
                <div class="todo-cal-day-items">
                  <div
                    v-for="todo in day.todos"
                    :key="todo.id"
                    class="todo-cal-dot"
                    :class="'priority-dot-' + todo.priority"
                    :title="todo.title"
                    @click.stop="todoStore.toggleTodo(todo.id, todo.auto || false)"
                  ></div>
                </div>
              </div>
            </div>
            <div v-if="todoCalSelectedTodos.length > 0" class="todo-cal-detail">
              <div class="todo-cal-detail-header">{{ todoCalSelectedDate }} 的待办 ({{ todoCalSelectedTodos.length }})</div>
              <div class="todo-cal-detail-list">
                <div
                  v-for="todo in todoCalSelectedTodos"
                  :key="todo.id"
                  class="todo-quick-item"
                  :class="{ completed: todo.status === 'completed', overdue: isOverdue(todo) }"
                >
                  <button class="todo-check" @click="todoStore.toggleTodo(todo.id, todo.auto || false)">
                    {{ todo.status === 'completed' ? '✅' : '⬜' }}
                  </button>
                  <div class="todo-info">
                    <span class="todo-title">{{ todo.title }}</span>
                    <span class="todo-due">{{ todo.dueDate }}</span>
                  </div>
                  <span class="todo-priority" :class="'priority-' + todo.priority">
                    {{ todo.priority === 'high' ? '高' : todo.priority === 'medium' ? '中' : '低' }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- 🗓 周视图 -->
          <div v-if="todoViewMode === 'week'" class="todo-week-view">
            <div class="todo-week-nav">
              <button class="dp-nav-btn" @click="todoWeekPrev">◀ 上一周</button>
              <button class="dp-today-btn" @click="todoWeekGoToday">本周</button>
              <button class="dp-nav-btn" @click="todoWeekNext">下一周 ▶</button>
              <span class="todo-cal-label">{{ todoWeekRangeLabel }}</span>
            </div>
            <div class="todo-week-grid">
              <div
                v-for="day in todoWeekDays"
                :key="day.date"
                class="todo-week-col"
                :class="{ today: day.isToday }"
              >
                <div class="todo-week-header">
                  <div class="todo-week-name">{{ day.weekday }}</div>
                  <div class="todo-week-num" :class="{ 'is-today': day.isToday }">{{ day.dayNum }}</div>
                </div>
                <div class="todo-week-items">
                  <div
                    v-for="todo in day.todos"
                    :key="todo.id"
                    class="todo-week-item"
                    :class="[
                      'priority-border-' + todo.priority,
                      { completed: todo.status === 'completed', overdue: isOverdue(todo) }
                    ]"
                    @click="todoStore.toggleTodo(todo.id, todo.auto || false)"
                  >
                    <span class="todo-week-item-title">{{ todo.title }}</span>
                    <span class="todo-priority" :class="'priority-' + todo.priority" style="font-size:9px">
                      {{ todo.priority === 'high' ? '高' : todo.priority === 'medium' ? '中' : '低' }}
                    </span>
                  </div>
                  <div v-if="day.todos.length === 0" class="todo-week-empty">-</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useDataStore } from '@/stores/data'
import { useTodoStore } from '@/stores/todo'
import { useCustomerStore } from '@/stores/customer'
import { useQuotationStore } from '@/stores/quotation'
import { useContractStore } from '@/stores/contract'
import { useInventoryStore } from '@/stores/inventory'
import { useCollectionStore } from '@/stores/collection'
import Chart from 'chart.js/auto'

const dataStore = useDataStore()
const todoStore = useTodoStore()
const customerStore = useCustomerStore()
const quotationStore = useQuotationStore()
const contractStore = useContractStore()
const inventoryStore = useInventoryStore()
const collectionStore = useCollectionStore()

const isLoading = ref(true)

const selectedRange = ref('month')
const chartMode = ref('monthly')
const salesChartRef = ref(null)
const inventoryChartRef = ref(null)
const collectionTrendChartRef = ref(null)
let salesChart = null
let inventoryChart = null
let collectionTrendChart = null

const dateRanges = [
  { key: 'month', label: '本月' },
  { key: 'quarter', label: '本季' },
  { key: 'year', label: '本年' }
]

function getRangeStart() {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  if (selectedRange.value === 'month') {
    return new Date(y, m, 1).toISOString().slice(0, 10)
  } else if (selectedRange.value === 'quarter') {
    const qStart = Math.floor(m / 3) * 3
    return new Date(y, qStart, 1).toISOString().slice(0, 10)
  }
  return new Date(y, 0, 1).toISOString().slice(0, 10)
}

const totalRevenue = computed(() => {
  const start = getRangeStart()
  return contractStore.contracts
    .filter(c => c.signDate && c.signDate >= start && c.status !== 'cancelled' && c.status !== 'draft')
    .reduce((s, c) => s + (c.totalAmount || 0), 0)
})

const revenueGrowth = computed(() => {
  const ma = contractStore.monthlyAmounts
  if (ma.length < 2) return 0
  const sorted = [...ma].sort((a, b) => b.month.localeCompare(a.month))
  const current = sorted[0].amount
  const prev = sorted[1].amount
  if (prev === 0) return current > 0 ? 100 : 0
  return Math.round(((current - prev) / prev) * 1000) / 10
})

const monthCollected = computed(() => {
  const start = getRangeStart()
  return collectionStore.collections
    .filter(c => c.status !== 'voided' && (c.status === 'confirmed' || c.status === 'completed') && c.date && c.date >= start)
    .reduce((s, c) => s + (parseFloat(c.amount) || 0), 0)
})

const collectionRate = computed(() => {
  const total = totalRevenue.value
  if (total === 0) return 0
  return Math.round((monthCollected.value / total) * 100)
})

const todayTransactionCount = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  let count = 0
  contractStore.contracts.forEach(c => { if (c.signDate === today && c.status !== 'cancelled' && c.status !== 'draft') count++ })
  collectionStore.collections.forEach(c => { if (c.date === today && c.status !== 'voided') count++ })
  dataStore.quotations.forEach(q => { if (q.date === today) count++ })
  return count
})

const todayTransactionAmount = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  let amount = 0
  contractStore.contracts.forEach(c => { if (c.signDate === today && c.status !== 'cancelled' && c.status !== 'draft') amount += (c.totalAmount || 0) })
  collectionStore.collections.forEach(c => { if (c.date === today && c.status !== 'voided') amount += (parseFloat(c.amount) || 0) })
  dataStore.quotations.forEach(q => { if (q.date === today) amount += (q.total || q.subtotal || 0) })
  return amount
})

const statCards = computed(() => [
  {
    icon: '🏢', label: '客户总数',
    value: customerStore.activeCount,
    change: `共 ${customerStore.customers.length} 个客户`,
    color: 'var(--color-accent)', bgColor: 'var(--color-accent-subtle)'
  },
  {
    icon: '📝', label: '本月报价',
    value: dataStore.quotations.length,
    change: `${dataStore.pendingQuotationCount} 待处理`,
    color: 'var(--color-success)', bgColor: 'var(--color-success-subtle)',
    changeColor: 'var(--color-success)'
  },
  {
    icon: '📦', label: '库存品类',
    value: inventoryStore.enrichedInventory.length,
    change: `${inventoryStore.lowStockCount + inventoryStore.exhaustedCount} 低库存预警`,
    color: 'var(--color-warning)', bgColor: 'var(--color-warning-subtle)',
    changeColor: inventoryStore.lowStockCount + inventoryStore.exhaustedCount > 0 ? 'var(--color-danger)' : undefined
  },
  {
    icon: '�', label: '本月合同',
    value: contractStore.contracts.filter(c => c.signDate && c.signDate >= getRangeStart() && c.status !== 'cancelled').length,
    change: `${contractStore.signedCount} 已签订`,
    color: 'var(--color-purple)', bgColor: 'var(--color-purple-subtle)'
  },
  {
    icon: '📋', label: '待办事项',
    value: todoStore.stats.pending,
    change: todoStore.stats.overdue > 0 ? `${todoStore.stats.overdue} 项逾期` : '无逾期',
    color: 'var(--color-danger)', bgColor: 'var(--color-danger-subtle)',
    changeColor: todoStore.stats.overdue > 0 ? 'var(--color-danger)' : undefined
  },
  {
    icon: '💳', label: '今日交易',
    value: todayTransactionCount,
    change: '¥' + formatNumber(todayTransactionAmount),
    color: 'var(--color-info)', bgColor: 'var(--color-info-subtle)'
  },
  {
    icon: '⏳', label: '待回款金额',
    value: '¥' + formatNumber(Math.max(0, totalRevenue.value - monthCollected.value)),
    change: '应收未收',
    color: 'var(--color-danger)', bgColor: 'var(--color-danger-subtle)'
  }
])

const alerts = computed(() => {
  const list = []
  inventoryStore.alertItems.forEach(item => {
    list.push({
      id: 'stock-' + item.id,
      level: item.alertStatus === 'exhausted' ? 'danger' : 'warning',
      title: `${item.name} 库存不足`,
      desc: `当前库存 ${item.stock.toFixed(1)}kg，安全库存 ${item.safetyStockVal}kg`,
      time: '实时'
    })
  })
  todoStore.allTodos.filter(t => t.status !== 'completed' && isOverdue(t)).forEach(todo => {
    list.push({
      id: 'todo-' + todo.id,
      level: 'danger',
      title: `待办逾期: ${todo.title}`,
      desc: `截止日期 ${todo.dueDate} 已过期`,
      time: todo.dueDate
    })
  })
  return list
})

const recentActivities = computed(() => {
  const activities = []
  const now = new Date()

  function timeAgo(dateStr) {
    if (!dateStr) return '未知'
    const d = new Date(dateStr)
    const diff = now - d
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return mins <= 1 ? '刚刚' : `${mins}分钟前`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}小时前`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}天前`
    return dateStr.slice(0, 10)
  }

  contractStore.contracts
    .filter(c => c.createdAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 2)
    .forEach(c => {
      activities.push({
        id: 'contract-' + c.id,
        text: `${c.partyA || '客户'} ${c.status === 'signed' ? '合同签署' : '合同创建'}`,
        time: timeAgo(c.createdAt),
        color: 'var(--color-success)'
      })
    })

  collectionStore.collections
    .filter(c => c.createdAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 2)
    .forEach(c => {
      activities.push({
        id: 'collection-' + c.id,
        text: `${c.customerName || '客户'} 回款 ¥${formatNumber(parseFloat(c.amount) || 0)} ${c.status === 'confirmed' ? '已确认' : '待确认'}`,
        time: timeAgo(c.createdAt),
        color: 'var(--color-warning)'
      })
    })

  customerStore.customers
    .filter(c => c.createdAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 1)
    .forEach(c => {
      activities.push({
        id: 'customer-' + c.id,
        text: `${c.name} 新客户建档`,
        time: timeAgo(c.createdAt),
        color: 'var(--color-purple)'
      })
    })

  return activities.sort((a, b) => {
    const order = { '刚刚': 0, '分钟前': 1, '小时前': 2, '天前': 3 }
    const getOrd = t => { for (const [k, v] of Object.entries(order)) { if (t.includes(k)) return v } return 9 }
    return getOrd(a.time) - getOrd(b.time)
  }).slice(0, 5)
})

const topCustomers = computed(() => {
  const sorted = [...customerStore.customers]
    .filter(c => c.status === 'active')
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 5)
  const maxBalance = sorted.length > 0 ? sorted[0].balance : 1
  return sorted.map(c => ({
    ...c,
    percentage: Math.round((c.balance / maxBalance) * 100)
  }))
})

const aiSummary = computed(() => {
  const parts = []
  const alertCount = inventoryStore.lowStockCount + inventoryStore.exhaustedCount
  if (alertCount > 0) parts.push(`${alertCount}项库存低于安全线`)
  if (todoStore.stats.overdue > 0) parts.push(`${todoStore.stats.overdue}项待办逾期`)
  if (dataStore.pendingQuotationCount > 0) parts.push(`${dataStore.pendingQuotationCount}份报价待处理`)
  if (parts.length === 0) return '当前业务运行正常，无异常指标。'
  return `检测到 ${parts.join('、')}，建议优先处理。`
})

const aiInsights = computed(() => {
  const insights = []
  const alertCount = inventoryStore.lowStockCount + inventoryStore.exhaustedCount
  if (alertCount > 0) {
    insights.push({ icon: '📦', text: `有 ${alertCount} 项物料低于最低库存，建议尽快补货` })
  }
  if (todoStore.stats.overdue > 0) {
    insights.push({ icon: '⏰', text: `${todoStore.stats.overdue} 项待办已逾期，请及时跟进` })
  }
  if (contractStore.pendingApprovalCount > 0) {
    insights.push({ icon: '📄', text: `${contractStore.pendingApprovalCount} 份合同待审批，可能影响回款周期` })
  }
  if (collectionRate.value < 60) {
    insights.push({ icon: '💰', text: `回款率仅 ${collectionRate.value}%，建议加强催收力度` })
  }
  if (insights.length === 0) {
    insights.push({ icon: '✅', text: '所有指标正常，业务运行良好' })
  }
  return insights
})

function isOverdue(todo) {
  if (todo.status === 'completed') return false
  return todo.dueDate < new Date().toISOString().slice(0, 10)
}

function formatNumber(num) {
  if (num === undefined || num === null) return '0'
  return Number(num).toLocaleString('zh-CN')
}

function refreshData() {
  nextTick(() => {
    initSalesChart()
    initInventoryChart()
    initCollectionTrendChart()
  })
}

const isRefreshingInsights = ref(false)
function refreshInsights() {
  isRefreshingInsights.value = true
  setTimeout(() => {
    isRefreshingInsights.value = false
  }, 800)
}

const dpYear = ref(new Date().getFullYear())
const dpMonth = ref(new Date().getMonth() + 1)
const dpSelectedDate = ref(new Date().toISOString().slice(0, 10))
const dpManualDate = ref('')
const dpYears = Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i)
const weekOffset = ref(0)
const showTodoForm = ref(false)
const newTodoTitle = ref('')
const newTodoPriority = ref('medium')
const newTodoDue = ref('')
const todoFilter = ref('all')
const todoPriorityFilter = ref('all')
const todoViewMode = ref('list')

const todoFilterOptions = [
  { key: 'all', label: '全部' },
  { key: 'today', label: '今日' },
  { key: 'overdue', label: '已逾期' },
  { key: 'completed', label: '已完成' }
]

const todoViewModes = [
  { key: 'table', icon: '📊', label: '表格' },
  { key: 'list', icon: '📋', label: '列表' },
  { key: 'card', icon: '🗂', label: '卡片' },
  { key: 'calendar', icon: '📅', label: '日历' },
  { key: 'week', icon: '🗓', label: '周视图' }
]

const todoCalYear = ref(new Date().getFullYear())
const todoCalMonth = ref(new Date().getMonth() + 1)
const todoCalSelectedDate = ref(new Date().toISOString().slice(0, 10))

const todoCalDays = computed(() => {
  const year = todoCalYear.value
  const month = todoCalMonth.value
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
      todos: todoStore.allTodos.filter(t => t.dueDate === date).slice(0, 3)
    })
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    result.push({
      key: date, day: i, currentMonth: true, isToday: date === today, date,
      todos: todoStore.allTodos.filter(t => t.dueDate === date).slice(0, 3)
    })
  }
  const remaining = 42 - result.length
  for (let i = 1; i <= remaining; i++) {
    const nm = month === 12 ? 1 : month + 1
    const ny = month === 12 ? year + 1 : year
    const date = `${ny}-${String(nm).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    result.push({
      key: date, day: i, currentMonth: false, isToday: date === today, date,
      todos: todoStore.allTodos.filter(t => t.dueDate === date).slice(0, 3)
    })
  }
  return result
})

const todoCalSelectedTodos = computed(() => {
  return todoStore.allTodos.filter(t => t.dueDate === todoCalSelectedDate.value)
})

const todoWeekOffset = ref(0)

const todoWeekDays = computed(() => {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(now)
  monday.setDate(now.getDate() + mondayOffset + todoWeekOffset.value * 7)
  const todayStr = now.toISOString().slice(0, 10)
  const result = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateStr = d.toISOString().slice(0, 10)
    const dayTodos = filteredDpTodos.value.filter(t => t.dueDate === dateStr)
    result.push({
      date: dateStr,
      dayNum: d.getDate(),
      weekday: weekdayNames[d.getDay()],
      isToday: dateStr === todayStr,
      todos: dayTodos
    })
  }
  return result
})

const todoWeekRangeLabel = computed(() => {
  if (todoWeekDays.value.length === 0) return ''
  const first = todoWeekDays.value[0]
  const last = todoWeekDays.value[6]
  return `${first.date.slice(5)} ~ ${last.date.slice(5)}`
})

function todoCalPrevYear() { todoCalYear.value-- }
function todoCalNextYear() { todoCalYear.value++ }
function todoCalPrevMonth() {
  if (todoCalMonth.value === 1) { todoCalMonth.value = 12; todoCalYear.value-- }
  else todoCalMonth.value--
}
function todoCalNextMonth() {
  if (todoCalMonth.value === 12) { todoCalMonth.value = 1; todoCalYear.value++ }
  else todoCalMonth.value++
}
function todoCalGoToday() {
  const now = new Date()
  todoCalYear.value = now.getFullYear()
  todoCalMonth.value = now.getMonth() + 1
  todoCalSelectedDate.value = now.toISOString().slice(0, 10)
}
function todoCalSelectDate(date) { todoCalSelectedDate.value = date }
function todoWeekPrev() { todoWeekOffset.value-- }
function todoWeekNext() { todoWeekOffset.value++ }
function todoWeekGoToday() { todoWeekOffset.value = 0 }

const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

const weekDays = computed(() => {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(now)
  monday.setDate(now.getDate() + mondayOffset + weekOffset.value * 7)
  const todayStr = now.toISOString().slice(0, 10)
  const result = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateStr = d.toISOString().slice(0, 10)
    const dayTodos = todoStore.allTodos.filter(t => t.dueDate === dateStr)
    result.push({
      date: dateStr,
      dayNum: d.getDate(),
      weekday: weekdayNames[d.getDay()],
      isToday: dateStr === todayStr,
      todos: dayTodos.slice(0, 5)
    })
  }
  return result
})

const weekRangeLabel = computed(() => {
  if (weekDays.value.length === 0) return ''
  const first = weekDays.value[0]
  const last = weekDays.value[6]
  return `${first.date.slice(5)} ~ ${last.date.slice(5)}`
})

function weekPrev() { weekOffset.value-- }
function weekNext() { weekOffset.value++ }
function weekGoToday() { weekOffset.value = 0 }

const weekdays = ['日', '一', '二', '三', '四', '五', '六']

const dpSelectedWeekday = computed(() => {
  if (!dpSelectedDate.value) return ''
  const d = new Date(dpSelectedDate.value)
  return '星期' + weekdays[d.getDay()]
})

const dpDays = computed(() => {
  const year = dpYear.value
  const month = dpMonth.value
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
    result.push({ key: date, day, currentMonth: false, isToday: date === today, selected: date === dpSelectedDate.value, date, todoCount: todoStore.allTodos.filter(t => t.dueDate === date && t.status !== 'completed').length })
  }

  for (let i = 1; i <= daysInMonth; i++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    result.push({ key: date, day: i, currentMonth: true, isToday: date === today, selected: date === dpSelectedDate.value, date, todoCount: todoStore.allTodos.filter(t => t.dueDate === date && t.status !== 'completed').length })
  }

  const remaining = 42 - result.length
  for (let i = 1; i <= remaining; i++) {
    const nm = month === 12 ? 1 : month + 1
    const ny = month === 12 ? year + 1 : year
    const date = `${ny}-${String(nm).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    result.push({ key: date, day: i, currentMonth: false, isToday: date === today, selected: date === dpSelectedDate.value, date, todoCount: todoStore.allTodos.filter(t => t.dueDate === date && t.status !== 'completed').length })
  }

  return result
})

const dpSelectedTodoCount = computed(() => {
  return todoStore.allTodos.filter(t => t.dueDate === dpSelectedDate.value && t.status !== 'completed').length
})

const filteredDpTodos = computed(() => {
  let list = todoStore.allTodos
  if (todoFilter.value === 'today') {
    const today = new Date().toISOString().slice(0, 10)
    list = list.filter(t => t.dueDate === today)
  } else if (todoFilter.value === 'overdue') {
    list = list.filter(t => t.status !== 'completed' && isOverdue(t))
  } else if (todoFilter.value === 'completed') {
    list = list.filter(t => t.status === 'completed')
  }
  if (todoPriorityFilter.value !== 'all') {
    list = list.filter(t => t.priority === todoPriorityFilter.value)
  }
  return list.slice(0, 10)
})

function dpPrevYear() { dpYear.value-- }
function dpNextYear() { dpYear.value++ }
function dpPrevMonth() {
  if (dpMonth.value === 1) { dpMonth.value = 12; dpYear.value-- }
  else dpMonth.value--
}
function dpNextMonth() {
  if (dpMonth.value === 12) { dpMonth.value = 1; dpYear.value++ }
  else dpMonth.value++
}
function dpGoToday() {
  const now = new Date()
  dpYear.value = now.getFullYear()
  dpMonth.value = now.getMonth() + 1
  dpSelectedDate.value = now.toISOString().slice(0, 10)
}
function dpSelectDate(date) { dpSelectedDate.value = date }
function dpApplyManual() {
  if (dpManualDate.value) {
    const d = new Date(dpManualDate.value)
    dpYear.value = d.getFullYear()
    dpMonth.value = d.getMonth() + 1
    dpSelectedDate.value = dpManualDate.value
  }
}
function addNewTodo() {
  if (!newTodoTitle.value.trim()) return
  todoStore.addTodo({
    title: newTodoTitle.value,
    priority: newTodoPriority.value,
    dueDate: newTodoDue.value || dpSelectedDate.value,
    status: 'pending'
  })
  newTodoTitle.value = ''
  newTodoPriority.value = 'medium'
  newTodoDue.value = ''
  showTodoForm.value = false
}
function completeAllTodos() {
  filteredDpTodos.value.forEach(t => {
    if (t.status !== 'completed') todoStore.toggleTodo(t.id, t.auto || false)
  })
}
function clearCompletedTodos() {
  todoStore.clearCompleted()
}

function initSalesChart() {
  if (!salesChartRef.value) return
  if (salesChart) salesChart.destroy()

  const ma = contractStore.monthlyAmounts
  const monthlyMap = {}
  ma.forEach(m => { monthlyMap[m.month] = m.amount })

  let labels, salesData, collectionData

  if (chartMode.value === 'quarterly') {
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4']
    const now = new Date()
    const year = now.getFullYear()
    salesData = quarters.map((_, i) => {
      let sum = 0
      for (let m = i * 3 + 1; m <= i * 3 + 3; m++) {
        const key = `${year}-${String(m).padStart(2, '0')}`
        sum += monthlyMap[key] || 0
      }
      return Math.round(sum / 10000)
    })
    collectionData = quarters.map((_, i) => {
      let sum = 0
      for (let m = i * 3 + 1; m <= i * 3 + 3; m++) {
        const key = `${year}-${String(m).padStart(2, '0')}`
        sum += (monthlyMap[key] || 0) * 0.85
      }
      return Math.round(sum / 10000)
    })
    labels = quarters
  } else if (chartMode.value === 'yearly') {
    const yearSet = new Set(ma.map(m => m.month.slice(0, 4)))
    const years = [...yearSet].sort()
    salesData = years.map(y => {
      let sum = 0
      ma.forEach(m => { if (m.month.startsWith(y)) sum += m.amount })
      return Math.round(sum / 10000)
    })
    collectionData = years.map(y => {
      let sum = 0
      ma.forEach(m => { if (m.month.startsWith(y)) sum += m.amount * 0.85 })
      return Math.round(sum / 10000)
    })
    labels = years
  } else {
    labels = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
    const now = new Date()
    const year = now.getFullYear()
    salesData = labels.map((_, i) => {
      const key = `${year}-${String(i + 1).padStart(2, '0')}`
      return Math.round((monthlyMap[key] || 0) / 10000)
    })
    collectionData = labels.map((_, i) => {
      const key = `${year}-${String(i + 1).padStart(2, '0')}`
      return Math.round((monthlyMap[key] || 0) * 0.85 / 10000)
    })
  }

  salesChart = new Chart(salesChartRef.value, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: '销售额(万)',
          data: salesData,
          backgroundColor: 'rgba(59, 130, 246, 0.6)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
          borderRadius: 4
        },
        {
          label: '回款额(万)',
          data: collectionData,
          backgroundColor: 'rgba(34, 197, 94, 0.6)',
          borderColor: 'rgba(34, 197, 94, 1)',
          borderWidth: 1,
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: '#94a3b8', font: { size: 11 } }
        }
      },
      scales: {
        x: {
          ticks: { color: '#64748b', font: { size: 10 } },
          grid: { color: 'rgba(51, 65, 85, 0.3)' }
        },
        y: {
          ticks: { color: '#64748b', font: { size: 10 } },
          grid: { color: 'rgba(51, 65, 85, 0.3)' }
        }
      }
    }
  })
}

function initInventoryChart() {
  if (!inventoryChartRef.value) return
  if (inventoryChart) inventoryChart.destroy()

  const categories = {}
  inventoryStore.enrichedInventory.forEach(item => {
    if (!categories[item.category]) categories[item.category] = 0
    categories[item.category] += item.stock
  })

  const labels = Object.keys(categories)
  const data = Object.values(categories)
  const colors = [
    'rgba(59, 130, 246, 0.8)',
    'rgba(34, 197, 94, 0.8)',
    'rgba(245, 158, 11, 0.8)',
    'rgba(168, 85, 247, 0.8)',
    'rgba(239, 68, 68, 0.8)',
    'rgba(6, 182, 212, 0.8)'
  ]

  inventoryChart = new Chart(inventoryChartRef.value, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.slice(0, labels.length),
        borderWidth: 0,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'right',
          labels: { color: '#94a3b8', font: { size: 11 }, padding: 12 }
        }
      }
    }
  })
}

function initCollectionTrendChart() {
  if (!collectionTrendChartRef.value) return
  if (collectionTrendChart) collectionTrendChart.destroy()

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const labels = []
  const data = []
  for (let i = 5; i >= 0; i--) {
    const m = month - i
    const d = new Date(year, m, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    labels.push(`${d.getMonth() + 1}月`)
    let sum = 0
    collectionStore.collections
      .filter(c => c.status !== 'voided' && (c.status === 'confirmed' || c.status === 'completed') && c.date && c.date.startsWith(key))
      .forEach(c => { sum += parseFloat(c.amount) || 0 })
    data.push(Math.round(sum / 10000))
  }

  collectionTrendChart = new Chart(collectionTrendChartRef.value, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: '回款额(万)',
        data,
        borderColor: 'rgba(34, 197, 94, 1)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#94a3b8', font: { size: 11 } } }
      },
      scales: {
        x: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: 'rgba(51, 65, 85, 0.3)' } },
        y: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: 'rgba(51, 65, 85, 0.3)' } }
      }
    }
  })
}

onMounted(async () => {
  customerStore.initSeedData()
  dataStore.initSeedData()
  inventoryStore.initSeedData()
  collectionStore.initSeedData()
  isLoading.value = false
  await nextTick()
  initSalesChart()
  initInventoryChart()
  initCollectionTrendChart()
})

watch(chartMode, () => {
  nextTick(() => initSalesChart())
})
</script>

<style scoped>
.dashboard-page {
  max-width: 1600px;
  margin: 0 auto;
}
.dashboard-toolbar {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  margin-bottom: var(--space-4);
  flex-wrap: wrap;
}
.toolbar-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.btn-group {
  display: flex;
  gap: 2px;
}
.btn-group .btn.active {
  background: var(--color-accent-subtle);
  color: var(--color-accent);
  border-color: var(--color-accent);
}
.dash-highlight-grid {
  display: grid;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}
.stats-grid-4 {
  grid-template-columns: repeat(4, 1fr);
}
.stats-grid-7 {
  grid-template-columns: repeat(7, 1fr);
}
.dash-stat-card {
  background: var(--color-surface-elevated);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  border-left: 4px solid var(--card-color, var(--color-accent));
  transition: transform var(--transition-fast);
}
.dash-stat-card:hover {
  transform: translateY(-2px);
}
.dash-stat-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-1);
}
.dash-stat-value {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  font-family: var(--font-mono);
  margin-bottom: var(--space-1);
}
.dash-stat-sub {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}
.stats-row {
  display: grid;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}
.alert-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.alert-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--color-bg-primary);
}
.alert-icon {
  font-size: 12px;
  margin-top: 2px;
  flex-shrink: 0;
}
.alert-content {
  flex: 1;
  min-width: 0;
}
.alert-title {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}
.alert-desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: 2px;
}
.alert-time {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}
.alert-empty {
  text-align: center;
  padding: var(--space-8) 0;
  color: var(--color-text-tertiary);
}
.timeline {
  position: relative;
  padding-left: var(--space-6);
}
.timeline-item {
  position: relative;
  padding-bottom: var(--space-4);
  display: flex;
  gap: var(--space-3);
}
.timeline-item:last-child {
  padding-bottom: 0;
}
.timeline-dot {
  position: absolute;
  left: calc(-1 * var(--space-6) + 4px);
  top: 6px;
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}
.timeline-content {
  flex: 1;
}
.timeline-text {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}
.timeline-time {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: 2px;
}
.quick-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);
}
.quick-action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-4);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.quick-action-card:hover {
  border-color: var(--color-accent);
  background: var(--color-accent-subtle);
  transform: translateY(-2px);
}
.quick-action-icon {
  font-size: 24px;
}
.quick-action-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
.top-customers {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.top-customer-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.top-rank {
  width: 24px;
  height: 24px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xs);
  font-weight: 700;
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  flex-shrink: 0;
}
.top-rank.rank-1 { background: #fbbf24; color: #1a1f36; }
.top-rank.rank-2 { background: #94a3b8; color: #1a1f36; }
.top-rank.rank-3 { background: #d97706; color: #1a1f36; }
.top-info {
  flex: 1;
  min-width: 0;
}
.top-name {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  margin-bottom: var(--space-1);
}
.top-bar-container {
  height: 4px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-full);
  overflow: hidden;
}
.top-bar {
  height: 100%;
  background: var(--color-accent);
  border-radius: var(--radius-full);
  transition: width 500ms ease;
}
.top-amount {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-accent);
  font-family: var(--font-mono);
  flex-shrink: 0;
}
.todo-quick-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.todo-quick-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  background: var(--color-bg-primary);
  transition: all var(--transition-fast);
}
.todo-quick-item.overdue {
  border-left: 3px solid var(--color-danger);
}
.todo-quick-item.completed {
  opacity: 0.5;
}
.todo-check {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}
.todo-info {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-width: 0;
}
.todo-title {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.todo-due {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}
.todo-due.overdue {
  color: var(--color-danger);
  font-weight: 600;
}
.todo-priority {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}
.priority-high { background: var(--color-danger-subtle); color: var(--color-danger); }
.priority-medium { background: var(--color-warning-subtle); color: var(--color-warning); }
.priority-low { background: var(--color-info-subtle); color: var(--color-info); }
.todo-empty {
  text-align: center;
  padding: var(--space-6) 0;
  color: var(--color-text-tertiary);
}
.ai-insight-panel {
  border-left: 3px solid var(--color-purple);
}
.ai-loading {
  text-align: center;
  padding: var(--space-8) 0;
  color: var(--color-purple);
  font-size: var(--font-size-sm);
  animation: pulse 1s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.date-todo-section {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: var(--space-4);
  margin-top: var(--space-4);
}
.date-picker-container {
  background: var(--color-surface-elevated);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  border: 1px solid var(--color-border);
}
.date-picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
}
.dp-header-left {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.dp-icon { font-size: 18px; }
.dp-year-month-selectors {
  display: flex;
  gap: var(--space-1);
}
.dp-year-select, .dp-month-select {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  padding: 2px 4px;
  font-size: var(--font-size-sm);
}
.date-picker-nav {
  display: flex;
  gap: 2px;
}
.dp-nav-btn {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  cursor: pointer;
  padding: 2px 8px;
  font-size: 12px;
}
.dp-nav-btn:hover { background: var(--color-accent-subtle); }
.dp-today-btn {
  background: var(--color-accent-subtle);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-sm);
  color: var(--color-accent);
  cursor: pointer;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 600;
}
.dp-manual-input-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
.dp-input-label { white-space: nowrap; }
.dp-manual-input {
  flex: 1;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  padding: 2px 6px;
  font-size: var(--font-size-xs);
}
.date-picker-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-1);
}
.date-picker-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}
.dp-day {
  text-align: center;
  padding: 6px 2px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--font-size-sm);
  position: relative;
  transition: all 0.15s;
}
.dp-day:hover { background: var(--color-accent-subtle); }
.dp-day.other-month { color: var(--color-text-tertiary); opacity: 0.4; }
.dp-day.today { background: var(--color-accent-subtle); font-weight: 700; color: var(--color-accent); }
.dp-day.selected { background: var(--color-accent); color: #fff; }
.dp-day-dot {
  position: absolute;
  bottom: 2px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--color-danger);
}
.dp-day.selected .dp-day-dot { background: #fff; }
.date-picker-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--space-3);
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-border);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
.dp-weekday-label { margin-left: var(--space-2); color: var(--color-text-tertiary); }
.dp-task-count { color: var(--color-accent); font-weight: 600; }
.todo-panel-wrapper { flex: 1; }
.dp-date-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  background: var(--color-bg-tertiary);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}
.todo-filters {
  display: flex;
  gap: 2px;
}
.todo-filter-btn {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  padding: 2px 8px;
  font-size: var(--font-size-xs);
  cursor: pointer;
  transition: all 0.15s;
}
.todo-filter-btn.active {
  background: var(--color-accent-subtle);
  color: var(--color-accent);
  border-color: var(--color-accent);
}
.todo-add-form {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  padding: var(--space-3);
  background: var(--color-bg-primary);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}
.todo-add-form input, .todo-add-form select {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  padding: 4px 8px;
  font-size: var(--font-size-sm);
}
.todo-add-form input[type="text"] { flex: 1; }
.todo-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
}
.todo-priority-filters {
  display: flex;
  gap: 4px;
}
.todo-priority-btn {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.15s;
}
.todo-priority-btn.p-all { background: var(--color-bg-tertiary); }
.todo-priority-btn.p-high { background: var(--color-danger); }
.todo-priority-btn.p-medium { background: var(--color-warning); }
.todo-priority-btn.p-low { background: var(--color-info); }
.todo-priority-btn.active { border-color: var(--color-text-primary); transform: scale(1.2); }
.todo-toolbar-right {
  display: flex;
  gap: var(--space-2);
}
.skeleton-wrapper {
  padding: var(--space-4);
}
.skeleton-row-4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}
.skeleton-row-2 {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: var(--space-4);
}
.skeleton {
  background: linear-gradient(90deg, var(--color-bg-tertiary) 25%, var(--color-surface-hover) 50%, var(--color-bg-tertiary) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
  border-radius: var(--radius-sm);
}
.skeleton-card { height: 100px; }
@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.ai-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: var(--radius-sm);
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  margin-right: var(--space-1);
  vertical-align: middle;
}
.ai-summary {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  padding: var(--space-3);
  background: var(--color-purple-subtle);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-3);
  line-height: 1.6;
}
.ai-insights {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.ai-insight-item {
  display: flex;
  gap: var(--space-2);
  align-items: flex-start;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.ai-insight-icon {
  flex-shrink: 0;
}
.week-view-section {
  background: var(--color-surface-elevated);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  margin-bottom: var(--space-4);
  border: 1px solid var(--color-border);
}
.week-view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
  flex-wrap: wrap;
  gap: var(--space-2);
}
.week-view-nav {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.week-view-range {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  background: var(--color-bg-tertiary);
  padding: 2px 10px;
  border-radius: var(--radius-sm);
  font-weight: 600;
}
.week-view-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: var(--space-2);
}
.week-day-col {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-2);
  min-height: 140px;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  flex-direction: column;
}
.week-day-col:hover {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 1px var(--color-accent-subtle);
}
.week-day-col.today {
  border-color: var(--color-accent);
  background: var(--color-accent-subtle);
}
.week-day-col.selected {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px var(--color-accent);
}
.week-day-header {
  text-align: center;
  margin-bottom: var(--space-2);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--color-border);
}
.week-day-name {
  font-size: 10px;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.week-day-num {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-text-primary);
  margin-top: 2px;
}
.week-day-num.is-today {
  color: var(--color-accent);
}
.week-day-todos {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  overflow: hidden;
}
.week-todo-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 4px;
  border-radius: var(--radius-sm);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
  overflow: hidden;
}
.week-todo-item:hover {
  background: var(--color-bg-tertiary);
}
.week-todo-item.completed {
  opacity: 0.4;
  text-decoration: line-through;
}
.week-todo-item.overdue {
  background: var(--color-danger-subtle);
}
.week-todo-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}
.week-todo-item.priority-high .week-todo-dot { background: var(--color-danger); }
.week-todo-item.priority-medium .week-todo-dot { background: var(--color-warning); }
.week-todo-item.priority-low .week-todo-dot { background: var(--color-info); }
.week-todo-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-primary);
}
.week-day-empty {
  text-align: center;
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
  padding: var(--space-2) 0;
}
.week-day-count {
  text-align: center;
  font-size: 10px;
  color: var(--color-accent);
  font-weight: 600;
  margin-top: var(--space-1);
  padding-top: var(--space-1);
  border-top: 1px solid var(--color-border);
}
.todo-view-toggle {
  display: flex;
  gap: 2px;
}
.todo-view-btn {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  padding: 2px 8px;
  font-size: var(--font-size-xs);
  cursor: pointer;
  transition: all 0.15s;
}
.todo-view-btn.active {
  background: var(--color-accent-subtle);
  color: var(--color-accent);
  border-color: var(--color-accent);
}
.todo-table-view { overflow-x: auto; }
.todo-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}
.todo-table th {
  text-align: left;
  padding: var(--space-2) var(--space-3);
  border-bottom: 2px solid var(--color-border);
  color: var(--color-text-secondary);
  font-weight: 600;
  font-size: var(--font-size-xs);
  white-space: nowrap;
}
.todo-table td {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
  vertical-align: middle;
}
.todo-table tr.completed { opacity: 0.5; }
.todo-table tr.overdue { border-left: 3px solid var(--color-danger); }
.todo-table-title {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.todo-card-view {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-3);
}
.todo-card-item {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  transition: all 0.15s;
}
.todo-card-item:hover { border-color: var(--color-accent); }
.todo-card-item.completed { opacity: 0.5; }
.todo-card-item.overdue { border-color: var(--color-danger); }
.todo-card-item.priority-border-high { border-left: 3px solid var(--color-danger); }
.todo-card-item.priority-border-medium { border-left: 3px solid var(--color-warning); }
.todo-card-item.priority-border-low { border-left: 3px solid var(--color-info); }
.todo-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
}
.todo-card-title {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  font-weight: 500;
  margin-bottom: var(--space-2);
  line-height: 1.4;
}
.todo-card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}
.todo-calendar-view { }
.todo-cal-nav {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}
.todo-cal-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  background: var(--color-bg-tertiary);
  padding: 2px 10px;
  border-radius: var(--radius-sm);
  font-weight: 600;
}
.todo-cal-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-1);
}
.todo-cal-weekday { padding: var(--space-1) 0; font-weight: 600; }
.todo-cal-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}
.todo-cal-day {
  min-height: 60px;
  padding: var(--space-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s;
  background: var(--color-bg-primary);
}
.todo-cal-day:hover { border-color: var(--color-accent); background: var(--color-accent-subtle); }
.todo-cal-day.other-month { opacity: 0.35; }
.todo-cal-day.today { border-color: var(--color-accent); background: var(--color-accent-subtle); }
.todo-cal-day.selected { border-color: var(--color-accent); box-shadow: 0 0 0 2px var(--color-accent); }
.todo-cal-day-num { font-size: var(--font-size-xs); font-weight: 600; color: var(--color-text-primary); margin-bottom: 2px; }
.todo-cal-day.today .todo-cal-day-num { color: var(--color-accent); }
.todo-cal-day-items { display: flex; flex-wrap: wrap; gap: 2px; }
.todo-cal-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.15s;
}
.todo-cal-dot:hover { transform: scale(1.5); }
.todo-cal-dot.priority-dot-high { background: var(--color-danger); }
.todo-cal-dot.priority-dot-medium { background: var(--color-warning); }
.todo-cal-dot.priority-dot-low { background: var(--color-info); }
.todo-cal-detail {
  margin-top: var(--space-3);
  border-top: 1px solid var(--color-border);
  padding-top: var(--space-3);
}
.todo-cal-detail-header {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
}
.todo-cal-detail-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.todo-week-view { }
.todo-week-nav {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}
.todo-week-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: var(--space-2);
}
.todo-week-col {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-2);
  min-height: 120px;
  display: flex;
  flex-direction: column;
}
.todo-week-col.today {
  border-color: var(--color-accent);
  background: var(--color-accent-subtle);
}
.todo-week-header {
  text-align: center;
  margin-bottom: var(--space-2);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--color-border);
}
.todo-week-name {
  font-size: 10px;
  color: var(--color-text-tertiary);
  letter-spacing: 0.5px;
}
.todo-week-num {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-text-primary);
  margin-top: 2px;
}
.todo-week-num.is-today { color: var(--color-accent); }
.todo-week-items {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.todo-week-item {
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
  overflow: hidden;
  border-left: 3px solid transparent;
}
.todo-week-item:hover { background: var(--color-bg-tertiary); }
.todo-week-item.completed { opacity: 0.4; text-decoration: line-through; }
.todo-week-item.overdue { background: var(--color-danger-subtle); }
.todo-week-item.priority-border-high { border-left-color: var(--color-danger); }
.todo-week-item.priority-border-medium { border-left-color: var(--color-warning); }
.todo-week-item.priority-border-low { border-left-color: var(--color-info); }
.todo-week-item-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-primary);
}
.todo-week-empty {
  text-align: center;
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
  padding: var(--space-2) 0;
}
@media (max-width: 1024px) {
  .stats-grid-4 { grid-template-columns: repeat(2, 1fr); }
  .stats-grid-7 { grid-template-columns: repeat(3, 1fr); }
  .quick-actions { grid-template-columns: repeat(2, 1fr); }
  .week-view-grid { grid-template-columns: repeat(4, 1fr); }
  .week-day-col:nth-child(n+5) { display: none; }
}
@media (max-width: 640px) {
  .stats-grid-4 { grid-template-columns: 1fr; }
  .stats-grid-7 { grid-template-columns: repeat(2, 1fr); }
  .quick-actions { grid-template-columns: repeat(2, 1fr); }
  .week-view-grid { grid-template-columns: repeat(3, 1fr); }
  .week-day-col:nth-child(n+4) { display: none; }
}
</style>
