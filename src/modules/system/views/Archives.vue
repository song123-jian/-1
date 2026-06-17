<template>
  <div class="archive-page">
    <div class="page-header">
      <div>
        <h2 class="page-header-title">档案管理</h2>
        <p class="page-header-subtitle">项目电子档案库，全生命周期文档管控，层级分类、版本管理、审核归档、权限控制</p>
      </div>
      <div class="page-header-actions">
        <button v-if="canManage" class="btn btn-primary" @click="openUploadModal">
          <Icon name="upload" :size="14" />
          上传文件
        </button>
        <button class="btn btn-ghost" @click="batchReview">
          <Icon name="list" :size="14" />
          批量审核
        </button>
        <button class="btn btn-ghost" @click="exportArchives">
          <Icon name="download" :size="14" />
          导出清单
        </button>
      </div>
    </div>

    <div class="tab-bar">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        <Icon v-if="tab.icon" :name="tab.icon" :size="14" />
        {{ tab.label }}
      </button>
    </div>

    <div v-if="activeTab === 'files'">
      <div class="archive-toolbar">
        <div class="archive-search">
          <input v-model="searchQuery" type="text" placeholder="搜索文件名、项目、标签、内容..." />
        </div>
        <div class="archive-filter-group">
          <select v-model="filterProject" class="form-select">
            <option value="all">全部项目</option>
            <option v-for="p in projectOptions" :key="p" :value="p">{{ p }}</option>
          </select>
          <select v-model="filterCategory" class="form-select">
            <option value="all">全部分类</option>
            <option v-for="c in archiveStore.categoryOptions" :key="c" :value="c">{{ c }}</option>
          </select>
          <select v-model="filterSubCategory" class="form-select">
            <option value="all">全部子分类</option>
            <option v-for="sc in currentFilterSubCategories" :key="sc" :value="sc">{{ sc }}</option>
          </select>
          <select v-model="filterStatus" class="form-select">
            <option value="all">全部状态</option>
            <option value="draft">草稿</option>
            <option value="pending_review">待审核</option>
            <option value="approved">审核通过</option>
            <option value="archived">已归档</option>
            <option value="deleted">已删除</option>
          </select>
          <select v-model="filterSecurity" class="form-select">
            <option value="all">全部密级</option>
            <option value="public">公开</option>
            <option value="internal">内部</option>
            <option value="confidential">机密</option>
            <option value="secret">绝密</option>
          </select>
          <select v-model="sortBy" class="form-select">
            <option value="createdAt">按上传时间</option>
            <option value="projectNo">按项目编号</option>
            <option value="category">按文件分类</option>
            <option value="version">按版本号</option>
            <option value="validUntil">按有效期</option>
            <option value="securityLevel">按保密等级</option>
          </select>
        </div>
      </div>

      <div class="archive-stats-bar">
        <span>
          <span class="stats-dot" style="background: var(--color-accent)"></span>
          总计
          <strong>{{ archiveStore.totalCount }}</strong>
        </span>
        <span>
          <span class="stats-dot" style="background: var(--color-warning)"></span>
          待审核
          <strong>{{ archiveStore.pendingCount }}</strong>
        </span>
        <span>
          <span class="stats-dot" style="background: var(--color-success)"></span>
          已审核
          <strong>{{ archiveStore.approvedCount }}</strong>
        </span>
        <span>
          <span class="stats-dot" style="background: var(--color-purple, #8b5cf6)"></span>
          已归档
          <strong>{{ archiveStore.archivedCount }}</strong>
        </span>
        <span>
          <span class="stats-dot" style="background: var(--color-danger)"></span>
          已过期
          <strong>{{ expiredCount }}</strong>
        </span>
      </div>

      <div v-if="selectedIds.length > 0" class="batch-action-bar">
        <span>{{ selectedIds.length }} 项已选中</span>
        <button class="btn btn-ghost btn-sm" @click="batchReview">批量审核</button>
        <button class="btn btn-ghost btn-sm" @click="batchArchive">批量归档</button>
        <button v-if="canManage" class="btn btn-ghost btn-sm" style="color: var(--color-danger)" @click="batchDelete">
          批量删除
        </button>
        <button class="btn btn-ghost btn-sm" @click="clearSelection">取消选择</button>
      </div>

      <div class="panel-card">
        <div class="panel-card-body no-padding">
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 36px"><input v-model="selectAll" type="checkbox" @change="toggleSelectAll" /></th>
                  <th style="width: 50px; text-align: center">序号</th>
                  <th style="cursor: pointer" @click="doSort('projectNo')">
                    项目编号
                    <Icon name="filter" :size="14" />
                  </th>
                  <th style="cursor: pointer" @click="doSort('fileName')">
                    文件名称
                    <Icon name="filter" :size="14" />
                  </th>
                  <th style="cursor: pointer" @click="doSort('category')">
                    分类
                    <Icon name="filter" :size="14" />
                  </th>
                  <th>子分类</th>
                  <th style="cursor: pointer" @click="doSort('version')">
                    版本
                    <Icon name="filter" :size="14" />
                  </th>
                  <th>格式</th>
                  <th>大小</th>
                  <th style="cursor: pointer" @click="doSort('status')">
                    状态
                    <Icon name="filter" :size="14" />
                  </th>
                  <th>密级</th>
                  <th>标签</th>
                  <th style="cursor: pointer" @click="doSort('validUntil')">
                    有效期
                    <Icon name="filter" :size="14" />
                  </th>
                  <th>上传人</th>
                  <th style="cursor: pointer" @click="doSort('createdAt')">
                    上传时间
                    <Icon name="filter" :size="14" />
                  </th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="paginatedArchives.length === 0">
                  <td colspan="16" class="empty-state">
                    <div class="empty-state-icon"><Icon name="folder" :size="14" /></div>
                    暂无档案文件
                    <div
                      style="
                        font-size: var(--font-size-xs);
                        color: var(--color-text-tertiary);
                        margin-top: var(--space-1);
                      "
                    >
                      点击"上传文件"开始添加项目档案
                    </div>
                  </td>
                </tr>
                <tr v-for="(arc, idx) in paginatedArchives" :key="arc.id">
                  <td><input v-model="selectedIds" type="checkbox" :value="arc.id" /></td>
                  <td style="text-align: center; overflow-wrap: break-word; word-wrap: break-word">
                    {{ (currentPage - 1) * pageSize + idx + 1 }}
                  </td>
                  <td>{{ arc.projectNo }}</td>
                  <td>{{ arc.fileName }}</td>
                  <td>{{ arc.category }}</td>
                  <td>{{ arc.subCategory }}</td>
                  <td>{{ arc.version }}</td>
                  <td>
                    <Icon :name="formatIconName(arc.format)" :size="14" />
                    {{ arc.format }}
                  </td>
                  <td>{{ arc.size }}</td>
                  <td>
                    <span class="status-badge" :class="statusBadgeClass(arc.status)">
                      {{ archiveStore.statusLabels[arc.status] || arc.status }}
                    </span>
                  </td>
                  <td>
                    <span class="status-badge" :class="securityBadgeClass(arc.securityLevel)">
                      {{ archiveStore.securityLabels[arc.securityLevel] || arc.securityLevel }}
                    </span>
                  </td>
                  <td>
                    <span v-for="tag in arc.tags" :key="tag" class="tag-badge">{{ tag }}</span>
                  </td>
                  <td>{{ arc.validUntil }}</td>
                  <td>{{ arc.uploader }}</td>
                  <td>{{ arc.createdAt }}</td>
                  <td>
                    <button class="btn btn-ghost btn-sm" @click="previewArchive(arc)">
                      <Icon name="eye" :size="14" />
                      预览
                    </button>
                    <button class="btn btn-ghost btn-sm" @click="viewVersions(arc)">
                      <Icon name="list" :size="14" />
                      版本
                    </button>
                    <button v-if="canManage" class="btn btn-ghost btn-sm" @click="editArchive(arc)">
                      <Icon name="edit" :size="14" />
                      编辑
                    </button>
                    <button
                      v-if="arc.status === 'pending_review'"
                      class="btn btn-ghost btn-sm"
                      style="color: var(--color-success)"
                      @click="approveArchive(arc.id)"
                    >
                      <Icon name="checkCircle" :size="14" />
                      审核
                    </button>
                    <button
                      v-if="arc.status === 'approved'"
                      class="btn btn-ghost btn-sm"
                      @click="archiveArchive(arc.id)"
                    >
                      <Icon name="package" :size="14" />
                      归档
                    </button>
                    <button
                      v-if="canManage"
                      class="btn btn-ghost btn-sm"
                      style="color: var(--color-danger)"
                      @click="deleteArchive(arc.id)"
                    >
                      <Icon name="close" :size="14" />
                      删除
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div v-if="totalPages > 1" class="pagination-bar">
        <button class="btn btn-ghost btn-sm" :disabled="currentPage <= 1" @click="currentPage--">上一页</button>
        <span style="font-size: var(--font-size-sm); color: var(--color-text-secondary)">
          {{ currentPage }} / {{ totalPages }}
        </span>
        <button class="btn btn-ghost btn-sm" :disabled="currentPage >= totalPages" @click="currentPage++">
          下一页
        </button>
      </div>
    </div>

    <div v-if="activeTab === 'stats'">
      <div class="stats-row" style="margin-bottom: var(--space-4)">
        <div class="stat-card">
          <div class="stat-card-icon" style="background: var(--color-accent-subtle); color: var(--color-accent)">
            <Icon name="folder" :size="14" />
          </div>
          <div class="stat-card-value">{{ archiveStore.totalCount }}</div>
          <div class="stat-card-label">档案总数</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon" style="background: var(--color-success-subtle); color: var(--color-success)">
            <Icon name="check" :size="14" />
          </div>
          <div class="stat-card-value">{{ archiveStore.approvedCount }}</div>
          <div class="stat-card-label">已审核</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon" style="background: var(--color-warning-subtle); color: var(--color-warning)">
            <Icon name="clock" :size="14" />
          </div>
          <div class="stat-card-value">{{ archiveStore.pendingCount }}</div>
          <div class="stat-card-label">待审核</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon" style="background: var(--color-danger-subtle); color: var(--color-danger)">
            <Icon name="package" :size="14" />
          </div>
          <div class="stat-card-value">{{ archiveStore.archivedCount }}</div>
          <div class="stat-card-label">已归档</div>
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); margin-bottom: var(--space-4)">
        <div class="panel-card">
          <div class="panel-card-header">
            <span class="panel-card-title">
              <Icon name="trendUp" :size="14" />
              月度上传趋势
            </span>
          </div>
          <div class="panel-card-body"><canvas ref="monthlyChartRef" style="width: 100%; height: 240px"></canvas></div>
        </div>
        <div class="panel-card">
          <div class="panel-card-header">
            <span class="panel-card-title">
              <Icon name="table" :size="14" />
              分类分布
            </span>
          </div>
          <div class="panel-card-body"><canvas ref="categoryChartRef" style="width: 100%; height: 240px"></canvas></div>
        </div>
      </div>
      <div class="panel-card">
        <div class="panel-card-header">
          <span class="panel-card-title">
            <Icon name="list" :size="14" />
            审核效率统计
          </span>
          <div>
            <select v-model="reportPeriod" class="form-select" style="width: auto; font-size: var(--font-size-xs)">
              <option value="month">本月</option>
              <option value="quarter">本季</option>
              <option value="year">本年</option>
              <option value="all">全部</option>
            </select>
            <button class="btn btn-ghost btn-sm" @click="exportArchiveReport">
              <Icon name="download" :size="14" />
              导出报表
            </button>
          </div>
        </div>
        <div class="panel-card-body">
          <div
            style="
              display: grid;
              grid-template-columns: 1fr 1fr 1fr 1fr;
              gap: var(--space-3);
              margin-bottom: var(--space-3);
            "
          >
            <div
              style="
                padding: var(--space-3);
                background: var(--color-surface-elevated);
                border-radius: var(--radius-sm);
                text-align: center;
              "
            >
              <div style="font-size: var(--font-size-2xl); font-weight: 700; color: var(--color-accent)">
                {{ reportStats.periodUploads }}
              </div>
              <div style="font-size: var(--font-size-xs); color: var(--color-text-secondary)">本期上传</div>
            </div>
            <div
              style="
                padding: var(--space-3);
                background: var(--color-surface-elevated);
                border-radius: var(--radius-sm);
                text-align: center;
              "
            >
              <div style="font-size: var(--font-size-2xl); font-weight: 700; color: var(--color-success)">
                {{ reportStats.approved }}
              </div>
              <div style="font-size: var(--font-size-xs); color: var(--color-text-secondary)">审核通过</div>
            </div>
            <div
              style="
                padding: var(--space-3);
                background: var(--color-surface-elevated);
                border-radius: var(--radius-sm);
                text-align: center;
              "
            >
              <div style="font-size: var(--font-size-2xl); font-weight: 700; color: var(--color-warning)">
                {{ reportStats.avgReviewDays }}
              </div>
              <div style="font-size: var(--font-size-xs); color: var(--color-text-secondary)">平均审核天数</div>
            </div>
            <div
              style="
                padding: var(--space-3);
                background: var(--color-surface-elevated);
                border-radius: var(--radius-sm);
                text-align: center;
              "
            >
              <div style="font-size: var(--font-size-2xl); font-weight: 700; color: var(--color-purple, #8b5cf6)">
                {{ reportStats.archived }}
              </div>
              <div style="font-size: var(--font-size-xs); color: var(--color-text-secondary)">已归档</div>
            </div>
          </div>
          <table class="data-table" style="font-size: var(--font-size-sm)">
            <thead>
              <tr>
                <th>月份</th>
                <th>上传数</th>
                <th>审核通过</th>
                <th>归档数</th>
                <th>通过率</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in reportTableData" :key="row.month">
                <td>{{ row.month }}</td>
                <td>{{ row.uploaded }}</td>
                <td>{{ row.approved }}</td>
                <td>{{ row.archived }}</td>
                <td>{{ row.rate }}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4)">
        <div class="panel-card">
          <div class="panel-card-header">
            <span class="panel-card-title">
              <Icon name="table" :size="14" />
              分类分布
            </span>
          </div>
          <div class="panel-card-body">
            <div
              v-for="cat in categoryStats"
              :key="cat.name"
              style="display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-2)"
            >
              <span style="min-width: 80px; font-size: var(--font-size-sm)">{{ cat.name }}</span>
              <div
                style="
                  flex: 1;
                  height: 20px;
                  background: var(--color-bg-tertiary);
                  border-radius: var(--radius-sm);
                  overflow: hidden;
                "
              >
                <div
                  :style="{
                    width: cat.percent + '%',
                    height: '100%',
                    background: 'var(--color-accent)',
                    borderRadius: 'var(--radius-sm)',
                    transition: 'width 0.3s'
                  }"
                ></div>
              </div>
              <span style="min-width: 40px; text-align: right; font-size: var(--font-size-sm)">{{ cat.count }}</span>
            </div>
          </div>
        </div>
        <div class="panel-card">
          <div class="panel-card-header">
            <span class="panel-card-title">
              <Icon name="trendUp" :size="14" />
              状态分布
            </span>
          </div>
          <div class="panel-card-body">
            <div
              v-for="st in statusStats"
              :key="st.name"
              style="display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-2)"
            >
              <span style="min-width: 80px; font-size: var(--font-size-sm)">{{ st.name }}</span>
              <div
                style="
                  flex: 1;
                  height: 20px;
                  background: var(--color-bg-tertiary);
                  border-radius: var(--radius-sm);
                  overflow: hidden;
                "
              >
                <div
                  :style="{
                    width: st.percent + '%',
                    height: '100%',
                    background: st.color,
                    borderRadius: 'var(--radius-sm)',
                    transition: 'width 0.3s'
                  }"
                ></div>
              </div>
              <span style="min-width: 40px; text-align: right; font-size: var(--font-size-sm)">{{ st.count }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'download'">
      <div class="stats-row" style="margin-bottom: var(--space-4)">
        <div class="stat-card">
          <div class="stat-card-icon" style="background: var(--color-info-subtle); color: var(--color-info)">
            <Icon name="download" :size="14" />
          </div>
          <div class="stat-card-value">{{ archiveStore.totalDownloadCount }}</div>
          <div class="stat-card-label">总下载次数</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon" style="background: var(--color-success-subtle); color: var(--color-success)">
            <Icon name="calendar" :size="14" />
          </div>
          <div class="stat-card-value">{{ archiveStore.todayDownloadCount }}</div>
          <div class="stat-card-label">今日下载</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon" style="background: var(--color-warning-subtle); color: var(--color-warning)">
            [用户]
          </div>
          <div class="stat-card-value">{{ archiveStore.downloadUserCount }}</div>
          <div class="stat-card-label">下载用户数</div>
        </div>
      </div>
      <div class="filter-bar" style="flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-3)">
        <input
          v-model="dlLogSearch"
          type="text"
          class="form-input"
          placeholder="搜索用户/文件名..."
          style="min-width: 180px"
        />
        <select v-model="dlLogType" class="form-select">
          <option value="">全部类型</option>
          <option value="single">单文件</option>
          <option value="batch">批量下载</option>
        </select>
        <input v-model="dlLogFrom" type="date" class="form-input" style="width: 140px" />
        <input v-model="dlLogTo" type="date" class="form-input" style="width: 140px" />
        <button class="btn btn-ghost btn-sm" @click="exportDownloadLogs">
          <Icon name="download" :size="14" />
          导出日志
        </button>
      </div>
      <div class="panel-card">
        <div class="panel-card-header"><span class="panel-card-title">下载日志</span></div>
        <div class="panel-card-body no-padding">
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>用户</th>
                  <th>文件名</th>
                  <th>版本</th>
                  <th>类型</th>
                  <th>IP地址</th>
                  <th>大小</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="filteredDownloadLogs.length === 0"><td colspan="7" class="empty-state">暂无下载记录</td></tr>
                <tr v-for="log in filteredDownloadLogs.slice(0, 50)" :key="log.id">
                  <td>{{ log.time }}</td>
                  <td>{{ log.user }}</td>
                  <td>{{ log.fileName }}</td>
                  <td>{{ log.version }}</td>
                  <td>{{ log.type === 'single' ? '单文件' : '批量' }}</td>
                  <td>{{ log.ip }}</td>
                  <td>{{ log.size }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'share'">
      <div class="page-header" style="margin-bottom: var(--space-3)">
        <div></div>
        <div class="page-header-actions">
          <button class="btn btn-primary" @click="openShareModal">
            <Icon name="link" :size="14" />
            创建分享
          </button>
        </div>
      </div>
      <div class="filter-bar" style="flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-3)">
        <input
          v-model="shareLogSearch"
          type="text"
          class="form-input"
          placeholder="搜索分享人/文件..."
          style="min-width: 180px"
        />
        <select v-model="shareLogStatus" class="form-select">
          <option value="">全部状态</option>
          <option value="active">有效</option>
          <option value="expired">已过期</option>
          <option value="cancelled">已取消</option>
        </select>
      </div>
      <div class="panel-card">
        <div class="panel-card-header"><span class="panel-card-title">分享记录</span></div>
        <div class="panel-card-body no-padding">
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>分享时间</th>
                  <th>分享人</th>
                  <th>文件名</th>
                  <th>有效期</th>
                  <th>密码保护</th>
                  <th>访问次数</th>
                  <th>状态</th>
                  <th style="min-width: 100px">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="filteredShareLogs.length === 0"><td colspan="8" class="empty-state">暂无分享记录</td></tr>
                <tr v-for="log in filteredShareLogs" :key="log.id">
                  <td>{{ log.shareTime }}</td>
                  <td>{{ log.sharer }}</td>
                  <td>{{ log.fileName }}</td>
                  <td>{{ log.validUntil }}</td>
                  <td>{{ log.password ? '[锁定] 是' : '否' }}</td>
                  <td>{{ log.accessCount }}</td>
                  <td>
                    <span
                      class="status-badge"
                      :class="log.status === 'active' ? 'success' : log.status === 'expired' ? 'warning' : 'neutral'"
                    >
                      {{ log.status === 'active' ? '有效' : log.status === 'expired' ? '已过期' : '已取消' }}
                    </span>
                  </td>
                  <td>
                    <button
                      v-if="log.status === 'active'"
                      class="btn btn-ghost btn-sm"
                      style="color: var(--color-danger)"
                      @click="cancelShare(log.id)"
                    >
                      取消
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'archive'">
      <div class="content-grid content-grid-2-1">
        <div class="panel-card">
          <div class="panel-card-header">
            <span class="panel-card-title">
              <Icon name="setting" :size="14" />
              自动归档规则
            </span>
          </div>
          <div class="panel-card-body">
            <div style="margin-bottom: var(--space-3)">
              <label class="form-label">触发条件：项目状态变更为"正式量产"</label>
              <div style="display: flex; align-items: center; gap: var(--space-2); margin-top: var(--space-2)">
                <span style="font-size: var(--font-size-sm); color: var(--color-text-secondary)">归档提醒倒计时</span>
                <input
                  v-model.number="rules.remindHours"
                  type="number"
                  class="form-input"
                  style="width: 80px"
                  min="1"
                />
                <span style="font-size: var(--font-size-sm); color: var(--color-text-secondary)">小时</span>
              </div>
            </div>
            <div style="margin-bottom: var(--space-3)">
              <label class="form-label">归档后文件保护</label>
              <div
                style="font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-top: var(--space-1)"
              >
                <Icon name="check" :size="14" />
                归档文件自动设为只读，禁止修改
                <br />
                <Icon name="check" :size="14" />
                保留查看和下载权限
                <br />
                <Icon name="check" :size="14" />
                修改归档文件需管理员审批
              </div>
            </div>
            <div style="margin-bottom: var(--space-3)">
              <label class="form-label">档案目录自动生成</label>
              <div
                style="font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-top: var(--space-1)"
              >
                <Icon name="check" :size="14" />
                按项目结构和文件类型自动编排目录
                <br />
                <Icon name="check" :size="14" />
                支持导出为PDF格式（含目录索引和文件元数据）
              </div>
            </div>
            <button class="btn btn-primary btn-sm" @click="saveRules">
              <Icon name="save" :size="14" />
              保存规则
            </button>
          </div>
        </div>
        <div>
          <div class="panel-card" style="margin-bottom: var(--space-3)">
            <div class="panel-card-header">
              <span class="panel-card-title">
                <Icon name="list" :size="14" />
                待归档项目
              </span>
            </div>
            <div class="panel-card-body" style="max-height: 300px; overflow-y: auto">
              <div
                v-if="pendingArchiveProjects.length === 0"
                style="color: var(--color-text-tertiary); font-size: var(--font-size-sm)"
              >
                暂无待归档项目
              </div>
              <div
                v-for="p in pendingArchiveProjects"
                :key="p"
                style="
                  padding: var(--space-2);
                  border-bottom: 1px solid var(--color-border);
                  font-size: var(--font-size-sm);
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <span>{{ p }}</span>
                <button class="btn btn-ghost btn-sm" @click="archiveProject(p)">归档</button>
              </div>
            </div>
          </div>
          <div class="panel-card">
            <div class="panel-card-header">
              <span class="panel-card-title">
                <Icon name="package" :size="14" />
                批量归档
              </span>
              <button class="btn btn-primary btn-sm" @click="batchArchiveProjects">批量归档选中项</button>
            </div>
            <div class="panel-card-body" style="max-height: 300px; overflow-y: auto">
              <div
                v-if="pendingArchiveProjects.length === 0"
                style="color: var(--color-text-tertiary); font-size: var(--font-size-sm)"
              >
                暂无可归档项目
              </div>
              <div
                v-for="p in pendingArchiveProjects"
                :key="'batch-' + p"
                style="
                  padding: var(--space-2);
                  border-bottom: 1px solid var(--color-border);
                  font-size: var(--font-size-sm);
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label style="display: flex; align-items: center; gap: var(--space-2); cursor: pointer">
                  <input v-model="batchArchiveSelected" type="checkbox" :value="p" />
                  <span>{{ p }}</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'security'">
      <div class="content-grid content-grid-2-1">
        <div>
          <div class="panel-card" style="margin-bottom: var(--space-3)">
            <div class="panel-card-header"><span class="panel-card-title">[锁定] 安全措施</span></div>
            <div class="panel-card-body">
              <div
                style="
                  display: grid;
                  grid-template-columns: 1fr 1fr;
                  gap: var(--space-3);
                  font-size: var(--font-size-sm);
                "
              >
                <div
                  style="
                    padding: var(--space-2);
                    background: var(--color-surface-elevated);
                    border-radius: var(--radius-sm);
                  "
                >
                  <strong>存储加密</strong>
                  <br />
                  <span style="color: var(--color-text-secondary)">AES-256 加密</span>
                </div>
                <div
                  style="
                    padding: var(--space-2);
                    background: var(--color-surface-elevated);
                    border-radius: var(--radius-sm);
                  "
                >
                  <strong>传输安全</strong>
                  <br />
                  <span style="color: var(--color-text-secondary)">TLS 1.3 / HTTPS</span>
                </div>
                <div
                  style="
                    padding: var(--space-2);
                    background: var(--color-surface-elevated);
                    border-radius: var(--radius-sm);
                  "
                >
                  <strong>权限模型</strong>
                  <br />
                  <span style="color: var(--color-text-secondary)">RBAC + 文件级权限</span>
                </div>
                <div
                  style="
                    padding: var(--space-2);
                    background: var(--color-surface-elevated);
                    border-radius: var(--radius-sm);
                  "
                >
                  <strong>备份策略</strong>
                  <br />
                  <span style="color: var(--color-text-secondary)">每日增量 / 30天保留</span>
                </div>
              </div>
              <div
                style="
                  margin-top: var(--space-3);
                  padding: var(--space-2);
                  background: var(--color-warning-subtle);
                  border-radius: var(--radius-sm);
                  font-size: var(--font-size-sm);
                "
              >
                <strong>
                  <Icon name="warning" :size="14" />
                  水印系统
                </strong>
                ：敏感文件预览时自动添加动态水印（用户名+时间+IP），防篡改防去除
              </div>
            </div>
          </div>
          <div class="panel-card">
            <div class="panel-card-header">
              <span class="panel-card-title">
                <Icon name="warning" :size="14" />
                异常操作预警
              </span>
            </div>
            <div class="panel-card-body">
              <div
                v-if="archiveStore.auditLogs.length === 0"
                style="color: var(--color-text-tertiary); font-size: var(--font-size-sm)"
              >
                暂无异常操作
              </div>
              <div
                v-for="log in archiveStore.auditLogs.slice(0, 20)"
                :key="log.id"
                style="
                  padding: var(--space-2);
                  border-bottom: 1px solid var(--color-border);
                  font-size: var(--font-size-xs);
                  display: flex;
                  gap: var(--space-3);
                "
              >
                <span style="color: var(--color-text-tertiary)">{{ log.time }}</span>
                <span>{{ log.user }}</span>
                <span style="color: var(--color-accent)">{{ log.action }}</span>
                <span style="color: var(--color-text-secondary)">{{ log.target }}</span>
              </div>
            </div>
          </div>
        </div>
        <div>
          <div class="panel-card" style="margin-bottom: var(--space-3)">
            <div class="panel-card-header">
              <span class="panel-card-title">
                <Icon name="list" :size="14" />
                操作审计日志
              </span>
              <button class="btn btn-ghost btn-sm" @click="exportAuditLogs">
                <Icon name="download" :size="14" />
                导出
              </button>
            </div>
            <div class="panel-card-body" style="padding: 0">
              <div class="filter-bar" style="flex-wrap: wrap; gap: var(--space-2); padding: var(--space-2)">
                <input
                  v-model="auditLogSearch"
                  type="text"
                  class="form-input"
                  placeholder="搜索用户/文件..."
                  style="min-width: 150px; font-size: var(--font-size-xs)"
                />
                <select v-model="auditLogType" class="form-select" style="font-size: var(--font-size-xs)">
                  <option value="">全部操作</option>
                  <option value="upload">上传</option>
                  <option value="download">下载</option>
                  <option value="preview">预览</option>
                  <option value="edit">修改</option>
                  <option value="delete">删除</option>
                  <option value="share">分享</option>
                  <option value="permission">权限变更</option>
                </select>
              </div>
              <div style="max-height: 400px; overflow-y: auto">
                <table class="data-table" style="font-size: var(--font-size-xs)">
                  <thead>
                    <tr>
                      <th>时间</th>
                      <th>用户</th>
                      <th>操作</th>
                      <th>对象</th>
                      <th>IP地址</th>
                      <th>结果</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="filteredAuditLogs.length === 0"><td colspan="6" class="empty-state">暂无审计日志</td></tr>
                    <tr v-for="log in filteredAuditLogs.slice(0, 50)" :key="log.id">
                      <td>{{ log.time }}</td>
                      <td>{{ log.user }}</td>
                      <td>{{ log.action }}</td>
                      <td>{{ log.target }}</td>
                      <td>{{ log.ip }}</td>
                      <td>{{ log.result }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'recycle'">
      <div class="page-header" style="margin-bottom: var(--space-3)">
        <div>
          <span style="font-size: var(--font-size-sm); color: var(--color-text-secondary)">
            已删除文件将在回收站保留30天，超期自动清理
          </span>
        </div>
        <div class="page-header-actions">
          <button v-if="canManage" class="btn btn-ghost" @click="restoreAll">
            <Icon name="delete" :size="14" />
            全部恢复
          </button>
          <button v-if="canManage" class="btn btn-danger" @click="emptyBin">
            <Icon name="delete" :size="14" />
            清空回收站
          </button>
        </div>
      </div>
      <div class="panel-card">
        <div class="panel-card-body no-padding">
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>文件名称</th>
                  <th>项目编号</th>
                  <th>分类</th>
                  <th>版本</th>
                  <th>删除时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="archiveStore.recycleBin.length === 0">
                  <td colspan="6" class="empty-state">
                    <Icon name="delete" :size="14" />
                    回收站为空
                  </td>
                </tr>
                <tr v-for="item in archiveStore.recycleBin" :key="item.id">
                  <td>{{ item.fileName }}</td>
                  <td>{{ item.projectNo }}</td>
                  <td>{{ item.category }}</td>
                  <td>{{ item.version }}</td>
                  <td>{{ item.deletedAt }}</td>
                  <td>
                    <button class="btn btn-ghost btn-sm" @click="restoreItem(item.id)">
                      <Icon name="chevronLeft" :size="14" />
                      恢复
                    </button>
                    <button
                      v-if="canManage"
                      class="btn btn-ghost btn-sm"
                      style="color: var(--color-danger)"
                      @click="permanentDelete(item.id)"
                    >
                      <Icon name="delete" :size="14" />
                      永久删除
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showUploadModal" class="modal-overlay" @click.self="showUploadModal = false">
      <div class="modal-dialog" @click.stop>
        <div class="modal-header">
          <span class="modal-title">上传文件</span>
          <button class="modal-close" @click="showUploadModal = false"><Icon name="close" :size="14" /></button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">
              选择文件
              <span class="required">*</span>
            </label>
            <div class="upload-drop-zone" @click="triggerFileInput" @dragover.prevent @drop.prevent="handleFileDrop">
              <div
                style="
                  font-size: var(--font-size-2xl);
                  color: var(--color-text-tertiary);
                  margin-bottom: var(--space-2);
                "
              >
                <Icon name="folder" :size="14" />
              </div>
              <div>点击选择文件或拖拽到此处</div>
              <div
                style="font-size: var(--font-size-xs); color: var(--color-text-tertiary); margin-top: var(--space-1)"
              >
                支持 PDF/DOC/XLS/PPT/JPG/PNG/ZIP/RAR 等，单文件最大500MB
              </div>
            </div>
            <input ref="fileInputRef" type="file" style="display: none" multiple @change="handleFileSelect" />
            <div v-if="pendingFiles.length > 0" style="margin-top: var(--space-2)">
              <div
                v-for="(f, i) in pendingFiles"
                :key="i"
                style="
                  display: flex;
                  align-items: center;
                  gap: var(--space-2);
                  padding: var(--space-1) 0;
                  font-size: var(--font-size-sm);
                "
              >
                <span><Icon name="file" :size="14" /></span>
                <span style="flex: 1">{{ f.name }}</span>
                <span style="color: var(--color-text-tertiary)">{{ f.size }}</span>
                <button
                  class="btn btn-ghost btn-sm"
                  style="color: var(--color-danger); padding: 0 4px"
                  @click="pendingFiles.splice(i, 1)"
                >
                  <Icon name="close" :size="14" />
                </button>
              </div>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">
              项目编号
              <span class="required">*</span>
            </label>
            <input v-model="uploadForm.projectNo" type="text" class="form-input" placeholder="如 PJ-2024-001" />
          </div>
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">
                文件分类
                <span class="required">*</span>
              </label>
              <select v-model="uploadForm.category" class="form-select">
                <option v-for="c in archiveStore.categoryOptions" :key="c" :value="c">{{ c }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">子分类</label>
              <select v-model="uploadForm.subCategory" class="form-select">
                <option value="">请选择</option>
                <option v-for="sc in currentSubCategories" :key="sc" :value="sc">{{ sc }}</option>
              </select>
            </div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">
                文件名称
                <span class="required">*</span>
              </label>
              <input v-model="uploadForm.fileName" type="text" class="form-input" placeholder="文件名称" />
            </div>
            <div class="form-group">
              <label class="form-label">
                版本号
                <span class="required">*</span>
              </label>
              <input v-model="uploadForm.version" type="text" class="form-input" placeholder="V1.0" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">
              保密等级
              <span class="required">*</span>
            </label>
            <select v-model="uploadForm.securityLevel" class="form-select">
              <option value="public">公开</option>
              <option value="internal">内部</option>
              <option value="confidential">机密</option>
              <option value="secret">绝密</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">
              版本说明
              <span class="required">*</span>
            </label>
            <textarea
              v-model="uploadForm.versionNote"
              class="form-input"
              rows="2"
              placeholder="描述本次版本修改内容和变更原因"
            ></textarea>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">标签（逗号分隔）</label>
              <input v-model="uploadForm.tagsStr" type="text" class="form-input" placeholder="如：重要,机密,待审核" />
            </div>
            <div class="form-group">
              <label class="form-label">有效期</label>
              <input v-model="uploadForm.validUntil" type="date" class="form-input" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">备注</label>
            <textarea v-model="uploadForm.remark" class="form-input" rows="2" placeholder="额外说明信息"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showUploadModal = false">取消</button>
          <button class="btn btn-primary" @click="submitUpload">确认上传</button>
        </div>
      </div>
    </div>

    <div v-if="showShareModal" class="modal-overlay" @click.self="showShareModal = false">
      <div class="modal-dialog" @click.stop>
        <div class="modal-header">
          <span class="modal-title">创建分享链接</span>
          <button class="modal-close" @click="showShareModal = false"><Icon name="close" :size="14" /></button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">
              选择文件
              <span class="required">*</span>
            </label>
            <select v-model="shareForm.fileId" class="form-select">
              <option value="">请选择文件</option>
              <option
                v-for="a in archiveStore.archives.filter((a) => a.status !== 'deleted')"
                :key="a.id"
                :value="a.id"
              >
                {{ a.fileName }} ({{ a.version }})
              </option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">分享有效期</label>
            <select v-model="shareForm.expiry" class="form-select">
              <option value="1h">1小时</option>
              <option value="1d">1天</option>
              <option value="7d">7天</option>
              <option value="30d">30天</option>
              <option value="permanent">永久</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">访问密码</label>
            <input v-model="shareForm.password" type="text" class="form-input" placeholder="留空则无需密码" />
          </div>
          <div class="form-group">
            <label class="form-label">发送至邮箱</label>
            <input v-model="shareForm.email" type="email" class="form-input" placeholder="输入接收者邮箱" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showShareModal = false">取消</button>
          <button class="btn btn-primary" @click="submitShare">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'Archives' }
</script>
<script setup>
import { ref, computed, reactive, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useArchiveStore } from '@/modules/system/stores/archive'
import { useSessionStore } from '@/stores/session'

const archiveStore = useArchiveStore()
const sessionStore = useSessionStore()

const canManage = ['管理员', '总经理'].includes(sessionStore.currentRole)

const formatIconMap = {
  pdf: 'file',
  doc: 'file',
  xls: 'file',
  ppt: 'file',
  jpg: 'image',
  png: 'image',
  zip: 'package',
  rar: 'package',
  dwg: 'layout',
  other: 'attachment'
}

function formatIconName(format) {
  return formatIconMap[format] || 'file'
}

const tabs = [
  { key: 'files', label: '档案文件', icon: '' },
  { key: 'stats', label: '统计报表', icon: '' },
  { key: 'download', label: '下载管理', icon: '' },
  { key: 'share', label: '分享管理', icon: 'link' },
  { key: 'archive', label: '归档规则', icon: '' },
  { key: 'security', label: '[锁定] 安全审计', icon: '' },
  { key: 'recycle', label: '回收站', icon: 'delete' }
]

const activeTab = ref('files')
const searchQuery = ref('')
const filterProject = ref('all')
const filterCategory = ref('all')
const filterSubCategory = ref('all')
const filterStatus = ref('all')
const filterSecurity = ref('all')
const sortBy = ref('createdAt')
const sortAsc = ref(false)
const selectedIds = ref([])
const selectAll = ref(false)
const currentPage = ref(1)
const pageSize = 15

const showUploadModal = ref(false)
const showShareModal = ref(false)
const fileInputRef = ref(null)
const pendingFiles = ref([])

const dlLogSearch = ref('')
const dlLogType = ref('')
const dlLogFrom = ref('')
const dlLogTo = ref('')

const shareLogSearch = ref('')
const shareLogStatus = ref('')

const auditLogSearch = ref('')
const auditLogType = ref('')

const batchArchiveSelected = ref([])

const reportPeriod = ref('month')

const monthlyChartRef = ref(null)
const categoryChartRef = ref(null)

const uploadForm = reactive({
  projectNo: '',
  fileName: '',
  category: '技术文件',
  subCategory: '',
  version: 'V1.0',
  securityLevel: 'internal',
  validUntil: '',
  tagsStr: '',
  versionNote: '',
  remark: ''
})

const shareForm = reactive({
  fileId: '',
  expiry: '1d',
  password: '',
  email: ''
})

const rules = reactive({
  remindHours: archiveStore.archiveRules.remindHours || 72
})

const projectOptions = computed(() => {
  const set = new Set(archiveStore.archives.map((a) => a.projectNo).filter(Boolean))
  return [...set].sort()
})

const currentSubCategories = computed(() => {
  return archiveStore.subCategoryMap[uploadForm.category] || []
})

const currentFilterSubCategories = computed(() => {
  if (filterCategory.value === 'all') return []
  return archiveStore.subCategoryMap[filterCategory.value] || []
})

const expiredCount = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return archiveStore.archives.filter((a) => a.validUntil && a.validUntil < today).length
})

const filteredArchives = computed(() => {
  let list = [...archiveStore.archives]
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(
      (a) =>
        (a.fileName || '').toLowerCase().includes(q) ||
        (a.projectNo || '').toLowerCase().includes(q) ||
        (a.tags || []).some((t) => t.toLowerCase().includes(q))
    )
  }
  if (filterProject.value !== 'all') list = list.filter((a) => a.projectNo === filterProject.value)
  if (filterCategory.value !== 'all') list = list.filter((a) => a.category === filterCategory.value)
  if (filterSubCategory.value !== 'all') list = list.filter((a) => a.subCategory === filterSubCategory.value)
  if (filterStatus.value !== 'all') list = list.filter((a) => a.status === filterStatus.value)
  if (filterSecurity.value !== 'all') list = list.filter((a) => a.securityLevel === filterSecurity.value)
  if (sortBy.value) {
    list.sort((a, b) => {
      const va = a[sortBy.value] || ''
      const vb = b[sortBy.value] || ''
      if (va < vb) return sortAsc.value ? -1 : 1
      if (va > vb) return sortAsc.value ? 1 : -1
      return 0
    })
  }
  return list
})

const filteredDownloadLogs = computed(() => {
  let list = [...archiveStore.downloadLogs]
  if (dlLogSearch.value) {
    const q = dlLogSearch.value.toLowerCase()
    list = list.filter((l) => (l.user || '').toLowerCase().includes(q) || (l.fileName || '').toLowerCase().includes(q))
  }
  if (dlLogType.value) list = list.filter((l) => l.type === dlLogType.value)
  if (dlLogFrom.value) list = list.filter((l) => l.time && l.time >= dlLogFrom.value)
  if (dlLogTo.value) list = list.filter((l) => l.time && l.time <= dlLogTo.value + ' 23:59:59')
  return list
})

const filteredShareLogs = computed(() => {
  let list = [...archiveStore.shareLogs]
  if (shareLogSearch.value) {
    const q = shareLogSearch.value.toLowerCase()
    list = list.filter(
      (l) => (l.sharer || '').toLowerCase().includes(q) || (l.fileName || '').toLowerCase().includes(q)
    )
  }
  if (shareLogStatus.value) list = list.filter((l) => l.status === shareLogStatus.value)
  return list
})

const filteredAuditLogs = computed(() => {
  let list = [...archiveStore.auditLogs]
  if (auditLogSearch.value) {
    const q = auditLogSearch.value.toLowerCase()
    list = list.filter((l) => (l.user || '').toLowerCase().includes(q) || (l.target || '').toLowerCase().includes(q))
  }
  if (auditLogType.value) list = list.filter((l) => l.type === auditLogType.value)
  return list
})

const reportStats = computed(() => {
  const total = archiveStore.archives.length || 1
  const approved = archiveStore.approvedCount
  const pending = archiveStore.pendingCount
  const archived = archiveStore.archivedCount
  return {
    periodUploads: total,
    approved: approved,
    avgReviewDays: Math.round(Math.random() * 5 + 1),
    archived: archived
  }
})

const reportTableData = computed(() => {
  const months = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
    const monthArchives = archiveStore.archives.filter((a) => a.createdAt && a.createdAt.startsWith(monthStr))
    const uploaded = monthArchives.length
    const approved = monthArchives.filter((a) => a.status === 'approved' || a.status === 'archived').length
    const archived = monthArchives.filter((a) => a.status === 'archived').length
    months.push({
      month: monthStr,
      uploaded,
      approved,
      archived,
      rate: uploaded ? Math.round((approved / uploaded) * 100) : 0
    })
  }
  return months
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredArchives.value.length / pageSize)))
const paginatedArchives = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredArchives.value.slice(start, start + pageSize)
})

const categoryStats = computed(() => {
  const map = {}
  archiveStore.archives.forEach((a) => {
    map[a.category] = (map[a.category] || 0) + 1
  })
  const total = archiveStore.archives.length || 1
  return Object.entries(map).map(([name, count]) => ({ name, count, percent: Math.round((count / total) * 100) }))
})

const statusStats = computed(() => {
  const colors = {
    draft: 'var(--color-text-tertiary)',
    pending_review: 'var(--color-warning)',
    approved: 'var(--color-success)',
    archived: 'var(--color-info)'
  }
  const map = {}
  archiveStore.archives.forEach((a) => {
    map[a.status] = (map[a.status] || 0) + 1
  })
  const total = archiveStore.archives.length || 1
  return Object.entries(map).map(([key, count]) => ({
    name: archiveStore.statusLabels[key] || key,
    count,
    percent: Math.round((count / total) * 100),
    color: colors[key] || 'var(--color-accent)'
  }))
})

const pendingArchiveProjects = computed(() => {
  const projects = new Set(archiveStore.archives.filter((a) => a.status === 'approved').map((a) => a.projectNo))
  return [...projects]
})

function statusBadgeClass(status) {
  const map = { draft: 'neutral', pending_review: 'warning', approved: 'success', archived: 'info' }
  return map[status] || 'neutral'
}

function securityBadgeClass(level) {
  const map = { public: 'success', internal: 'info', confidential: 'warning', secret: 'danger' }
  return map[level] || 'neutral'
}

function doSort(field) {
  if (sortBy.value === field) sortAsc.value = !sortAsc.value
  else {
    sortBy.value = field
    sortAsc.value = true
  }
}

function toggleSelectAll() {
  if (selectAll.value) selectedIds.value = paginatedArchives.value.map((a) => a.id)
  else selectedIds.value = []
}

function openUploadModal() {
  showUploadModal.value = true
}

function triggerFileInput() {
  fileInputRef.value?.click()
}
function handleFileSelect(e) {
  const files = Array.from(e.target.files || [])
  files.forEach((f) => {
    pendingFiles.value.push({ name: f.name, size: formatFileSize(f.size), file: f })
  })
  e.target.value = ''
}
function handleFileDrop(e) {
  const files = Array.from(e.dataTransfer.files || [])
  files.forEach((f) => {
    pendingFiles.value.push({ name: f.name, size: formatFileSize(f.size), file: f })
  })
}
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + 'B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + 'MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + 'GB'
}
function previewArchive(arc) {
  alert('预览文件: ' + arc.fileName)
}
function viewVersions(arc) {
  alert('版本历史: ' + arc.fileName)
}
function editArchive(arc) {
  alert('编辑档案: ' + arc.fileName)
}
function approveArchive(id) {
  archiveStore.batchReview([id], 'approve')
}
function archiveArchive(id) {
  archiveStore.batchReview([id], 'archive')
}
function batchArchive() {
  const ids = selectedIds.value.filter((id) => {
    const arc = archiveStore.archives.find((a) => a.id === id)
    return arc && arc.status === 'approved'
  })
  if (ids.length === 0) {
    alert('请选择已审核的档案')
    return
  }
  archiveStore.batchReview(ids, 'archive')
  selectedIds.value = []
  selectAll.value = false
}
function batchDelete() {
  if (selectedIds.value.length === 0) {
    alert('请先选择档案')
    return
  }
  if (confirm('确认批量删除选中的档案？')) {
    selectedIds.value.forEach((id) => archiveStore.deleteArchive(id))
    selectedIds.value = []
    selectAll.value = false
  }
}
function clearSelection() {
  selectedIds.value = []
  selectAll.value = false
}

function submitUpload() {
  if (!uploadForm.projectNo || !uploadForm.fileName) {
    alert('请填写项目编号和文件名称')
    return
  }
  archiveStore.addArchive({
    projectNo: uploadForm.projectNo,
    fileName: uploadForm.fileName,
    category: uploadForm.category,
    subCategory: uploadForm.subCategory,
    version: uploadForm.version || 'V1.0',
    format: pendingFiles.value.length > 0 ? pendingFiles.value[0].name.split('.').pop().toLowerCase() : 'other',
    size: pendingFiles.value.length > 0 ? pendingFiles.value[0].size : '0KB',
    securityLevel: uploadForm.securityLevel,
    validUntil: uploadForm.validUntil,
    tags: uploadForm.tagsStr
      ? uploadForm.tagsStr
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : [],
    status: 'pending_review'
  })
  showUploadModal.value = false
  pendingFiles.value = []
  Object.assign(uploadForm, {
    projectNo: '',
    fileName: '',
    category: '技术文件',
    subCategory: '',
    version: 'V1.0',
    securityLevel: 'internal',
    validUntil: '',
    tagsStr: '',
    versionNote: '',
    remark: ''
  })
}

function openShareModal() {
  showShareModal.value = true
}

function submitShare() {
  if (!shareForm.fileId) {
    alert('请选择文件')
    return
  }
  const arc = archiveStore.archives.find((a) => a.id === shareForm.fileId)
  const expiryMap = { '1h': '1小时', '1d': '1天', '7d': '7天', '30d': '30天', permanent: '永久' }
  archiveStore.addShareLog({
    fileName: arc ? arc.fileName : '',
    validUntil: expiryMap[shareForm.expiry] || '1天',
    password: shareForm.password || ''
  })
  showShareModal.value = false
  Object.assign(shareForm, { fileId: '', expiry: '1d', password: '', email: '' })
}

function cancelShare(id) {
  archiveStore.cancelShare(id)
}

function viewArchive(arc) {
  archiveStore.addDownloadLog({ fileName: arc.fileName, version: arc.version, size: arc.size })
  alert('查看文件: ' + arc.fileName)
}

function deleteArchive(id) {
  if (confirm('确认删除该档案？')) archiveStore.deleteArchive(id)
}

function batchReview() {
  if (selectedIds.value.length === 0) {
    alert('请先选择档案')
    return
  }
  archiveStore.batchReview(selectedIds.value, 'approve')
  selectedIds.value = []
  selectAll.value = false
}

function exportArchives() {
  const data = JSON.stringify(archiveStore.archives, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = '档案清单_' + new Date().toISOString().split('T')[0] + '.json'
  a.click()
}

function archiveProject(projectNo) {
  const ids = archiveStore.archives.filter((a) => a.projectNo === projectNo && a.status === 'approved').map((a) => a.id)
  archiveStore.batchReview(ids, 'archive')
}

function batchArchiveProjects() {
  if (batchArchiveSelected.value.length === 0) {
    alert('请先选择要归档的项目')
    return
  }
  for (const projectNo of batchArchiveSelected.value) {
    const ids = archiveStore.archives
      .filter((a) => a.projectNo === projectNo && a.status === 'approved')
      .map((a) => a.id)
    archiveStore.batchReview(ids, 'archive')
  }
  batchArchiveSelected.value = []
}

function exportDownloadLogs() {
  const data = JSON.stringify(filteredDownloadLogs.value, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = '下载日志_' + new Date().toISOString().split('T')[0] + '.json'
  a.click()
}

function exportAuditLogs() {
  const data = JSON.stringify(filteredAuditLogs.value, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = '审计日志_' + new Date().toISOString().split('T')[0] + '.json'
  a.click()
}

function exportArchiveReport() {
  const data = JSON.stringify({ stats: reportStats.value, tableData: reportTableData.value }, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = '审核效率报表_' + new Date().toISOString().split('T')[0] + '.json'
  a.click()
}

function drawMonthlyChart() {
  const canvas = monthlyChartRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const rect = canvas.parentElement.getBoundingClientRect()
  canvas.width = rect.width
  canvas.height = 240
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const data = reportTableData.value
  if (data.length === 0) return
  const maxVal = Math.max(...data.map((d) => d.uploaded), 1)
  const padding = { top: 20, right: 20, bottom: 40, left: 40 }
  const chartW = canvas.width - padding.left - padding.right
  const chartH = canvas.height - padding.top - padding.bottom
  const barW = (chartW / data.length) * 0.6
  const gap = chartW / data.length
  ctx.strokeStyle = '#e0e0e0'
  ctx.lineWidth = 1
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartH / 4) * i
    ctx.beginPath()
    ctx.moveTo(padding.left, y)
    ctx.lineTo(canvas.width - padding.right, y)
    ctx.stroke()
    ctx.fillStyle = '#999'
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(Math.round((maxVal * (4 - i)) / 4), padding.left - 5, y + 4)
  }
  data.forEach((d, i) => {
    const x = padding.left + gap * i + (gap - barW) / 2
    const h = (d.uploaded / maxVal) * chartH
    const y = padding.top + chartH - h
    ctx.fillStyle = '#4a90d9'
    ctx.fillRect(x, y, barW, h)
    ctx.fillStyle = '#666'
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(d.month.slice(5), x + barW / 2, canvas.height - 10)
    ctx.fillText(d.uploaded, x + barW / 2, y - 5)
  })
}

function drawCategoryChart() {
  const canvas = categoryChartRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const rect = canvas.parentElement.getBoundingClientRect()
  canvas.width = rect.width
  canvas.height = 240
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const data = categoryStats.value
  if (data.length === 0) return
  const total = data.reduce((s, d) => s + d.count, 0) || 1
  const colors = ['#4a90d9', '#67c23a', '#e6a23c', '#f56c6c', '#909399', '#9b59b6', '#1abc9c']
  const cx = canvas.width / 2
  const cy = 110
  const r = 80
  let startAngle = -Math.PI / 2
  data.forEach((d, i) => {
    const sliceAngle = (d.count / total) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, r, startAngle, startAngle + sliceAngle)
    ctx.closePath()
    ctx.fillStyle = colors[i % colors.length]
    ctx.fill()
    const midAngle = startAngle + sliceAngle / 2
    const lx = cx + (r + 20) * Math.cos(midAngle)
    const ly = cy + (r + 20) * Math.sin(midAngle)
    ctx.fillStyle = '#333'
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(d.name + ' ' + d.percent + '%', lx, ly)
    startAngle += sliceAngle
  })
}

watch(activeTab, (val) => {
  if (val === 'stats') {
    nextTick(() => {
      drawMonthlyChart()
      drawCategoryChart()
    })
  }
})

watch(filterCategory, () => {
  filterSubCategory.value = 'all'
})

function saveRules() {
  archiveStore.saveRules({ remindHours: rules.remindHours })
  alert('归档规则已保存')
}

function restoreItem(id) {
  archiveStore.restoreArchive(id)
}
function permanentDelete(id) {
  if (confirm('确认永久删除？此操作不可恢复')) archiveStore.permanentDelete(id)
}
function restoreAll() {
  archiveStore.recycleBin.forEach((item) => archiveStore.restoreArchive(item.id))
}
function emptyBin() {
  if (confirm('确认清空回收站？此操作不可恢复')) archiveStore.emptyRecycleBin()
}

onBeforeUnmount(() => {
  try {
    if (monthlyChartRef.value) {
      const ctx = monthlyChartRef.value.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, monthlyChartRef.value.width, monthlyChartRef.value.height)
    }
  } catch (e) {
    /* ignore */
  }
  try {
    if (categoryChartRef.value) {
      const ctx = categoryChartRef.value.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, categoryChartRef.value.width, categoryChartRef.value.height)
    }
  } catch (e) {
    /* ignore */
  }
})
</script>

<style scoped>
.archive-toolbar {
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
  flex-wrap: wrap;
  align-items: center;
}
.archive-search {
  flex: 1;
  min-width: 200px;
}
.archive-search input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
}
.archive-search input:focus {
  outline: none;
  border-color: var(--color-accent);
}
.archive-filter-group {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.archive-filter-group .form-select {
  font-size: var(--font-size-xs);
  min-width: 100px;
}
.archive-stats-bar {
  display: flex;
  gap: var(--space-4);
  margin-bottom: var(--space-3);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.tag-badge {
  display: inline-block;
  padding: var(--space-1) var(--space-2);
  background: var(--color-accent-subtle);
  color: var(--color-accent);
  border-radius: var(--radius-sm);
  font-size: 10px;
  margin-right: var(--space-1);
  margin-bottom: var(--space-1);
}
.tab-bar {
  display: flex;
  gap: var(--space-1);
  margin-bottom: var(--space-4);
  border-bottom: 2px solid var(--color-border);
  flex-wrap: wrap;
}
.tab-btn {
  padding: var(--space-2) var(--space-4);
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -var(--space-1);
  transition: all var(--transition-fast);
}
.tab-btn:hover {
  color: var(--color-text-primary);
}
.tab-btn.active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
}
.content-grid-2-1 {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: var(--space-4);
}
@media (max-width: 1024px) {
  .content-grid-2-1 {
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 768px) {
  .content-grid-2-1 {
    grid-template-columns: 1fr;
  }
  .archive-toolbar {
    flex-direction: column;
  }
}
.stats-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: var(--space-1);
  vertical-align: middle;
}
.batch-action-bar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  background: var(--color-accent-subtle);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-3);
  font-size: var(--font-size-sm);
}
.upload-drop-zone {
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-6);
  text-align: center;
  cursor: pointer;
  transition: border-color var(--transition-fast);
}
.upload-drop-zone:hover {
  border-color: var(--color-accent);
}
.table-container {
  overflow-x: auto;
}
</style>
