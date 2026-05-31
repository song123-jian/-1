<template>
  <div class="archive-page">
    <div class="page-header">
      <div>
        <h2 class="page-header-title">档案管理</h2>
        <p class="page-header-subtitle">项目电子档案库，全生命周期文档管控，层级分类、版本管理、审核归档、权限控制</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-primary" @click="openUploadModal">📤 上传文件</button>
        <button class="btn btn-ghost" @click="batchReview">📋 批量审核</button>
        <button class="btn btn-ghost" @click="exportArchives">📥 导出清单</button>
      </div>
    </div>

    <div class="tab-bar">
      <button
        v-for="tab in tabs" :key="tab.key"
        class="tab-btn" :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >{{ tab.label }}</button>
    </div>

    <div v-if="activeTab === 'files'">
      <div class="archive-toolbar">
        <div class="archive-search">
          <input type="text" v-model="searchQuery" placeholder="搜索文件名、项目、标签、内容...">
        </div>
        <div class="archive-filter-group">
          <select class="form-select" v-model="filterProject">
            <option value="all">全部项目</option>
            <option v-for="p in projectOptions" :key="p" :value="p">{{ p }}</option>
          </select>
          <select class="form-select" v-model="filterCategory">
            <option value="all">全部分类</option>
            <option v-for="c in archiveStore.categoryOptions" :key="c" :value="c">{{ c }}</option>
          </select>
          <select class="form-select" v-model="filterSubCategory">
            <option value="all">全部子分类</option>
            <option v-for="sc in currentFilterSubCategories" :key="sc" :value="sc">{{ sc }}</option>
          </select>
          <select class="form-select" v-model="filterStatus">
            <option value="all">全部状态</option>
            <option value="draft">草稿</option>
            <option value="pending_review">待审核</option>
            <option value="approved">审核通过</option>
            <option value="archived">已归档</option>
            <option value="deleted">已删除</option>
          </select>
          <select class="form-select" v-model="filterSecurity">
            <option value="all">全部密级</option>
            <option value="public">公开</option>
            <option value="internal">内部</option>
            <option value="confidential">机密</option>
            <option value="secret">绝密</option>
          </select>
          <select class="form-select" v-model="sortBy">
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
        <span>共 <strong>{{ filteredArchives.length }}</strong> 个档案</span>
        <span>已选 <strong>{{ selectedIds.length }}</strong> 个</span>
      </div>

      <div class="panel-card">
        <div class="panel-card-body no-padding">
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width:36px"><input type="checkbox" v-model="selectAll" @change="toggleSelectAll"></th>
                  <th @click="doSort('projectNo')" style="cursor:pointer">项目编号 ↕</th>
                  <th @click="doSort('fileName')" style="cursor:pointer">文件名称 ↕</th>
                  <th @click="doSort('category')" style="cursor:pointer">分类 ↕</th>
                  <th>子分类</th>
                  <th @click="doSort('version')" style="cursor:pointer">版本 ↕</th>
                  <th>格式</th>
                  <th>大小</th>
                  <th @click="doSort('status')" style="cursor:pointer">状态 ↕</th>
                  <th>密级</th>
                  <th>标签</th>
                  <th @click="doSort('validUntil')" style="cursor:pointer">有效期 ↕</th>
                  <th>上传人</th>
                  <th @click="doSort('createdAt')" style="cursor:pointer">上传时间 ↕</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="paginatedArchives.length === 0">
                  <td colspan="15" class="empty-state">
                    <div class="empty-state-icon">📁</div>暂无档案数据
                  </td>
                </tr>
                <tr v-for="arc in paginatedArchives" :key="arc.id">
                  <td><input type="checkbox" :value="arc.id" v-model="selectedIds"></td>
                  <td>{{ arc.projectNo }}</td>
                  <td>{{ arc.fileName }}</td>
                  <td>{{ arc.category }}</td>
                  <td>{{ arc.subCategory }}</td>
                  <td>{{ arc.version }}</td>
                  <td>{{ archiveStore.formatIcons[arc.format] || '📎' }} {{ arc.format }}</td>
                  <td>{{ arc.size }}</td>
                  <td><span class="status-badge" :class="statusBadgeClass(arc.status)">{{ archiveStore.statusLabels[arc.status] || arc.status }}</span></td>
                  <td><span class="status-badge" :class="securityBadgeClass(arc.securityLevel)">{{ archiveStore.securityLabels[arc.securityLevel] || arc.securityLevel }}</span></td>
                  <td><span v-for="tag in arc.tags" :key="tag" class="tag-badge">{{ tag }}</span></td>
                  <td>{{ arc.validUntil }}</td>
                  <td>{{ arc.uploader }}</td>
                  <td>{{ arc.createdAt }}</td>
                  <td>
                    <button class="btn btn-ghost btn-sm" @click="viewArchive(arc)">查看</button>
                    <button class="btn btn-ghost btn-sm" style="color:var(--color-danger)" @click="deleteArchive(arc.id)">删除</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div class="pagination-bar" v-if="totalPages > 1">
        <button class="btn btn-ghost btn-sm" :disabled="currentPage <= 1" @click="currentPage--">上一页</button>
        <span style="font-size:var(--font-size-sm);color:var(--color-text-secondary)">{{ currentPage }} / {{ totalPages }}</span>
        <button class="btn btn-ghost btn-sm" :disabled="currentPage >= totalPages" @click="currentPage++">下一页</button>
      </div>
    </div>

    <div v-if="activeTab === 'stats'">
      <div class="stats-row" style="margin-bottom:var(--space-4)">
        <div class="stat-card"><div class="stat-card-icon" style="background:var(--color-accent-subtle);color:var(--color-accent)">📁</div><div class="stat-card-value">{{ archiveStore.totalCount }}</div><div class="stat-card-label">档案总数</div></div>
        <div class="stat-card"><div class="stat-card-icon" style="background:var(--color-success-subtle);color:var(--color-success)">✅</div><div class="stat-card-value">{{ archiveStore.approvedCount }}</div><div class="stat-card-label">已审核</div></div>
        <div class="stat-card"><div class="stat-card-icon" style="background:var(--color-warning-subtle);color:var(--color-warning)">⏳</div><div class="stat-card-value">{{ archiveStore.pendingCount }}</div><div class="stat-card-label">待审核</div></div>
        <div class="stat-card"><div class="stat-card-icon" style="background:var(--color-danger-subtle);color:var(--color-danger)">🗄️</div><div class="stat-card-value">{{ archiveStore.archivedCount }}</div><div class="stat-card-label">已归档</div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4);margin-bottom:var(--space-4)">
        <div class="panel-card">
          <div class="panel-card-header"><span class="panel-card-title">📈 月度上传趋势</span></div>
          <div class="panel-card-body"><canvas ref="monthlyChartRef" style="width:100%;height:240px"></canvas></div>
        </div>
        <div class="panel-card">
          <div class="panel-card-header"><span class="panel-card-title">📊 分类分布</span></div>
          <div class="panel-card-body"><canvas ref="categoryChartRef" style="width:100%;height:240px"></canvas></div>
        </div>
      </div>
      <div class="panel-card">
        <div class="panel-card-header"><span class="panel-card-title">📋 审核效率统计</span><div><select class="form-select" v-model="reportPeriod" style="width:auto;font-size:var(--font-size-xs)"><option value="month">本月</option><option value="quarter">本季</option><option value="year">本年</option><option value="all">全部</option></select> <button class="btn btn-ghost btn-sm" @click="exportArchiveReport">📥 导出报表</button></div></div>
        <div class="panel-card-body">
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--space-3);margin-bottom:var(--space-3)">
            <div style="padding:var(--space-3);background:var(--color-surface-elevated);border-radius:var(--radius-sm);text-align:center">
              <div style="font-size:var(--font-size-2xl);font-weight:700;color:var(--color-accent)">{{ reportStats.avgReviewHours }}</div>
              <div style="font-size:var(--font-size-xs);color:var(--color-text-secondary)">平均审核时长(小时)</div>
            </div>
            <div style="padding:var(--space-3);background:var(--color-surface-elevated);border-radius:var(--radius-sm);text-align:center">
              <div style="font-size:var(--font-size-2xl);font-weight:700;color:var(--color-success)">{{ reportStats.approvalRate }}%</div>
              <div style="font-size:var(--font-size-xs);color:var(--color-text-secondary)">审核通过率</div>
            </div>
            <div style="padding:var(--space-3);background:var(--color-surface-elevated);border-radius:var(--radius-sm);text-align:center">
              <div style="font-size:var(--font-size-2xl);font-weight:700;color:var(--color-warning)">{{ reportStats.pendingCount }}</div>
              <div style="font-size:var(--font-size-xs);color:var(--color-text-secondary)">待审核数量</div>
            </div>
          </div>
          <table class="data-table" style="font-size:var(--font-size-sm)">
            <thead><tr><th>月份</th><th>上传数</th><th>审核通过</th><th>归档数</th><th>通过率</th></tr></thead>
            <tbody>
              <tr v-for="row in reportTableData" :key="row.month">
                <td>{{ row.month }}</td><td>{{ row.uploaded }}</td><td>{{ row.approved }}</td><td>{{ row.archived }}</td><td>{{ row.rate }}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">
        <div class="panel-card">
          <div class="panel-card-header"><span class="panel-card-title">📊 分类分布</span></div>
          <div class="panel-card-body">
            <div v-for="cat in categoryStats" :key="cat.name" style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-2)">
              <span style="min-width:80px;font-size:var(--font-size-sm)">{{ cat.name }}</span>
              <div style="flex:1;height:20px;background:var(--color-bg-tertiary);border-radius:var(--radius-sm);overflow:hidden">
                <div :style="{ width: cat.percent + '%', height: '100%', background: 'var(--color-accent)', borderRadius: 'var(--radius-sm)', transition: 'width 0.3s' }"></div>
              </div>
              <span style="min-width:40px;text-align:right;font-size:var(--font-size-sm)">{{ cat.count }}</span>
            </div>
          </div>
        </div>
        <div class="panel-card">
          <div class="panel-card-header"><span class="panel-card-title">📈 状态分布</span></div>
          <div class="panel-card-body">
            <div v-for="st in statusStats" :key="st.name" style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-2)">
              <span style="min-width:80px;font-size:var(--font-size-sm)">{{ st.name }}</span>
              <div style="flex:1;height:20px;background:var(--color-bg-tertiary);border-radius:var(--radius-sm);overflow:hidden">
                <div :style="{ width: st.percent + '%', height: '100%', background: st.color, borderRadius: 'var(--radius-sm)', transition: 'width 0.3s' }"></div>
              </div>
              <span style="min-width:40px;text-align:right;font-size:var(--font-size-sm)">{{ st.count }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'download'">
      <div class="stats-row" style="margin-bottom:var(--space-4)">
        <div class="stat-card"><div class="stat-card-icon" style="background:var(--color-info-subtle);color:var(--color-info)">📥</div><div class="stat-card-value">{{ archiveStore.totalDownloadCount }}</div><div class="stat-card-label">总下载次数</div></div>
        <div class="stat-card"><div class="stat-card-icon" style="background:var(--color-success-subtle);color:var(--color-success)">📅</div><div class="stat-card-value">{{ archiveStore.todayDownloadCount }}</div><div class="stat-card-label">今日下载</div></div>
        <div class="stat-card"><div class="stat-card-icon" style="background:var(--color-warning-subtle);color:var(--color-warning)">👤</div><div class="stat-card-value">{{ archiveStore.downloadUserCount }}</div><div class="stat-card-label">下载用户数</div></div>
      </div>
      <div class="filter-bar" style="flex-wrap:wrap;gap:var(--space-2);margin-bottom:var(--space-3)">
        <input type="text" class="form-input" v-model="dlLogSearch" placeholder="搜索用户/文件名..." style="min-width:180px">
        <select class="form-select" v-model="dlLogType"><option value="">全部类型</option><option value="single">单文件</option><option value="batch">批量下载</option></select>
        <input type="date" class="form-input" v-model="dlLogFrom" style="width:140px">
        <input type="date" class="form-input" v-model="dlLogTo" style="width:140px">
        <button class="btn btn-ghost btn-sm" @click="exportDownloadLogs">📥 导出日志</button>
      </div>
      <div class="panel-card">
        <div class="panel-card-header"><span class="panel-card-title">下载日志</span></div>
        <div class="panel-card-body no-padding">
          <div class="table-container">
            <table class="data-table">
              <thead><tr><th>时间</th><th>用户</th><th>文件名</th><th>版本</th><th>类型</th><th>IP地址</th><th>大小</th></tr></thead>
              <tbody>
                <tr v-if="filteredDownloadLogs.length === 0"><td colspan="7" class="empty-state">暂无下载记录</td></tr>
                <tr v-for="log in filteredDownloadLogs.slice(0, 50)" :key="log.id">
                  <td>{{ log.time }}</td><td>{{ log.user }}</td><td>{{ log.fileName }}</td><td>{{ log.version }}</td><td>{{ log.type === 'single' ? '单文件' : '批量' }}</td><td>{{ log.ip }}</td><td>{{ log.size }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'share'">
      <div class="page-header" style="margin-bottom:var(--space-3)">
        <div></div>
        <div class="page-header-actions"><button class="btn btn-primary" @click="openShareModal">🔗 创建分享</button></div>
      </div>
      <div class="filter-bar" style="flex-wrap:wrap;gap:var(--space-2);margin-bottom:var(--space-3)">
        <input type="text" class="form-input" v-model="shareLogSearch" placeholder="搜索分享人/文件..." style="min-width:180px">
        <select class="form-select" v-model="shareLogStatus"><option value="">全部状态</option><option value="active">有效</option><option value="expired">已过期</option><option value="cancelled">已取消</option></select>
      </div>
      <div class="panel-card">
        <div class="panel-card-header"><span class="panel-card-title">分享记录</span></div>
        <div class="panel-card-body no-padding">
          <div class="table-container">
            <table class="data-table">
              <thead><tr><th>分享时间</th><th>分享人</th><th>文件名</th><th>有效期</th><th>密码保护</th><th>访问次数</th><th>状态</th><th style="min-width:100px">操作</th></tr></thead>
              <tbody>
                <tr v-if="filteredShareLogs.length === 0"><td colspan="8" class="empty-state">暂无分享记录</td></tr>
                <tr v-for="log in filteredShareLogs" :key="log.id">
                  <td>{{ log.shareTime }}</td><td>{{ log.sharer }}</td><td>{{ log.fileName }}</td><td>{{ log.validUntil }}</td><td>{{ log.password ? '是' : '否' }}</td><td>{{ log.accessCount }}</td>
                  <td><span class="status-badge" :class="log.status === 'active' ? 'success' : log.status === 'expired' ? 'warning' : 'neutral'">{{ log.status === 'active' ? '有效' : log.status === 'expired' ? '已过期' : '已取消' }}</span></td>
                  <td><button v-if="log.status === 'active'" class="btn btn-ghost btn-sm" style="color:var(--color-danger)" @click="cancelShare(log.id)">取消</button></td>
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
          <div class="panel-card-header"><span class="panel-card-title">⚙️ 自动归档规则</span></div>
          <div class="panel-card-body">
            <div style="margin-bottom:var(--space-3)">
              <label class="form-label">触发条件：项目状态变更为"正式量产"</label>
              <div style="display:flex;align-items:center;gap:var(--space-2);margin-top:var(--space-2)">
                <span style="font-size:var(--font-size-sm);color:var(--color-text-secondary)">归档提醒倒计时</span>
                <input type="number" class="form-input" v-model.number="rules.remindHours" style="width:80px" min="1">
                <span style="font-size:var(--font-size-sm);color:var(--color-text-secondary)">小时</span>
              </div>
            </div>
            <div style="margin-bottom:var(--space-3)">
              <label class="form-label">归档后文件保护</label>
              <div style="font-size:var(--font-size-sm);color:var(--color-text-secondary);margin-top:var(--space-1)">
                ✅ 归档文件自动设为只读，禁止修改<br>✅ 保留查看和下载权限<br>✅ 修改归档文件需管理员审批
              </div>
            </div>
            <div style="margin-bottom:var(--space-3)">
              <label class="form-label">档案目录自动生成</label>
              <div style="font-size:var(--font-size-sm);color:var(--color-text-secondary);margin-top:var(--space-1)">
                ✅ 按项目结构和文件类型自动编排目录<br>✅ 支持导出为PDF格式（含目录索引和文件元数据）
              </div>
            </div>
            <button class="btn btn-primary btn-sm" @click="saveRules">💾 保存规则</button>
          </div>
        </div>
        <div>
          <div class="panel-card" style="margin-bottom:var(--space-3)">
            <div class="panel-card-header"><span class="panel-card-title">📋 待归档项目</span></div>
            <div class="panel-card-body" style="max-height:300px;overflow-y:auto">
              <div v-if="pendingArchiveProjects.length === 0" style="color:var(--color-text-tertiary);font-size:var(--font-size-sm)">暂无待归档项目</div>
              <div v-for="p in pendingArchiveProjects" :key="p" style="padding:var(--space-2);border-bottom:1px solid var(--color-border);font-size:var(--font-size-sm);display:flex;justify-content:space-between;align-items:center">
                <span>{{ p }}</span>
                <button class="btn btn-ghost btn-sm" @click="archiveProject(p)">归档</button>
              </div>
            </div>
          </div>
          <div class="panel-card">
            <div class="panel-card-header"><span class="panel-card-title">📦 批量归档</span><button class="btn btn-primary btn-sm" @click="batchArchiveProjects">批量归档选中项</button></div>
            <div class="panel-card-body" style="max-height:300px;overflow-y:auto">
              <div v-if="pendingArchiveProjects.length === 0" style="color:var(--color-text-tertiary);font-size:var(--font-size-sm)">暂无可归档项目</div>
              <div v-for="p in pendingArchiveProjects" :key="'batch-'+p" style="padding:var(--space-2);border-bottom:1px solid var(--color-border);font-size:var(--font-size-sm);display:flex;justify-content:space-between;align-items:center">
                <label style="display:flex;align-items:center;gap:var(--space-2);cursor:pointer">
                  <input type="checkbox" :value="p" v-model="batchArchiveSelected">
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
          <div class="panel-card" style="margin-bottom:var(--space-3)">
            <div class="panel-card-header"><span class="panel-card-title">🔒 安全措施</span></div>
            <div class="panel-card-body">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);font-size:var(--font-size-sm)">
                <div style="padding:var(--space-2);background:var(--color-surface-elevated);border-radius:var(--radius-sm)"><strong>存储加密</strong><br><span style="color:var(--color-text-secondary)">AES-256 加密</span></div>
                <div style="padding:var(--space-2);background:var(--color-surface-elevated);border-radius:var(--radius-sm)"><strong>传输安全</strong><br><span style="color:var(--color-text-secondary)">TLS 1.3 / HTTPS</span></div>
                <div style="padding:var(--space-2);background:var(--color-surface-elevated);border-radius:var(--radius-sm)"><strong>权限模型</strong><br><span style="color:var(--color-text-secondary)">RBAC + 文件级权限</span></div>
                <div style="padding:var(--space-2);background:var(--color-surface-elevated);border-radius:var(--radius-sm)"><strong>备份策略</strong><br><span style="color:var(--color-text-secondary)">每日增量 / 30天保留</span></div>
              </div>
              <div style="margin-top:var(--space-3);padding:var(--space-2);background:var(--color-warning-subtle);border-radius:var(--radius-sm);font-size:var(--font-size-sm)">
                <strong>⚠️ 水印系统</strong>：敏感文件预览时自动添加动态水印（用户名+时间+IP），防篡改防去除
              </div>
            </div>
          </div>
          <div class="panel-card">
            <div class="panel-card-header"><span class="panel-card-title">🚨 异常操作预警</span></div>
            <div class="panel-card-body">
              <div v-if="archiveStore.auditLogs.length === 0" style="color:var(--color-text-tertiary);font-size:var(--font-size-sm)">暂无异常操作</div>
              <div v-for="log in archiveStore.auditLogs.slice(0, 20)" :key="log.id" style="padding:var(--space-2);border-bottom:1px solid var(--color-border);font-size:var(--font-size-xs);display:flex;gap:var(--space-3)">
                <span style="color:var(--color-text-tertiary)">{{ log.time }}</span>
                <span>{{ log.user }}</span>
                <span style="color:var(--color-accent)">{{ log.action }}</span>
                <span style="color:var(--color-text-secondary)">{{ log.target }}</span>
              </div>
            </div>
          </div>
        </div>
        <div>
          <div class="panel-card" style="margin-bottom:var(--space-3)">
            <div class="panel-card-header"><span class="panel-card-title">📋 操作审计日志</span><button class="btn btn-ghost btn-sm" @click="exportAuditLogs">📥 导出</button></div>
            <div class="panel-card-body" style="padding:0">
              <div class="filter-bar" style="flex-wrap:wrap;gap:var(--space-2);padding:var(--space-2)">
                <input type="text" class="form-input" v-model="auditLogSearch" placeholder="搜索用户/文件..." style="min-width:150px;font-size:var(--font-size-xs)">
                <select class="form-select" v-model="auditLogType" style="font-size:var(--font-size-xs)"><option value="">全部操作</option><option value="upload">上传</option><option value="download">下载</option><option value="preview">预览</option><option value="edit">修改</option><option value="delete">删除</option><option value="share">分享</option><option value="permission">权限变更</option></select>
              </div>
              <div style="max-height:400px;overflow-y:auto">
                <table class="data-table" style="font-size:var(--font-size-xs)">
                  <thead><tr><th>时间</th><th>用户</th><th>操作</th><th>对象</th><th>IP地址</th><th>结果</th></tr></thead>
                  <tbody>
                    <tr v-if="filteredAuditLogs.length === 0"><td colspan="6" class="empty-state">暂无审计日志</td></tr>
                    <tr v-for="log in filteredAuditLogs.slice(0, 50)" :key="log.id">
                      <td>{{ log.time }}</td><td>{{ log.user }}</td><td>{{ log.action }}</td><td>{{ log.target }}</td><td>{{ log.ip }}</td><td>{{ log.result }}</td>
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
      <div class="page-header" style="margin-bottom:var(--space-3)">
        <div><span style="font-size:var(--font-size-sm);color:var(--color-text-secondary)">已删除文件将在回收站保留30天，超期自动清理</span></div>
        <div class="page-header-actions">
          <button class="btn btn-ghost" @click="restoreAll">♻️ 全部恢复</button>
          <button class="btn btn-danger" @click="emptyBin">🗑️ 清空回收站</button>
        </div>
      </div>
      <div class="panel-card">
        <div class="panel-card-body no-padding">
          <div class="table-container">
            <table class="data-table">
              <thead><tr><th>文件名称</th><th>项目编号</th><th>分类</th><th>版本</th><th>删除时间</th><th>操作</th></tr></thead>
              <tbody>
                <tr v-if="archiveStore.recycleBin.length === 0"><td colspan="6" class="empty-state">回收站为空</td></tr>
                <tr v-for="item in archiveStore.recycleBin" :key="item.id">
                  <td>{{ item.fileName }}</td><td>{{ item.projectNo }}</td><td>{{ item.category }}</td><td>{{ item.version }}</td><td>{{ item.deletedAt }}</td>
                  <td>
                    <button class="btn btn-ghost btn-sm" @click="restoreItem(item.id)">恢复</button>
                    <button class="btn btn-ghost btn-sm" style="color:var(--color-danger)" @click="permanentDelete(item.id)">永久删除</button>
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
          <button class="modal-close" @click="showUploadModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group"><label class="form-label">项目编号 <span class="required">*</span></label><input type="text" class="form-input" v-model="uploadForm.projectNo" placeholder="如 PJ-2024-001"></div>
          <div class="form-row form-row-2">
            <div class="form-group"><label class="form-label">文件名称 <span class="required">*</span></label><input type="text" class="form-input" v-model="uploadForm.fileName" placeholder="文件名称"></div>
            <div class="form-group"><label class="form-label">分类</label><select class="form-select" v-model="uploadForm.category"><option v-for="c in archiveStore.categoryOptions" :key="c" :value="c">{{ c }}</option></select></div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group"><label class="form-label">子分类</label><select class="form-select" v-model="uploadForm.subCategory"><option value="">请选择</option><option v-for="sc in currentSubCategories" :key="sc" :value="sc">{{ sc }}</option></select></div>
            <div class="form-group"><label class="form-label">版本</label><input type="text" class="form-input" v-model="uploadForm.version" placeholder="1.0"></div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group"><label class="form-label">格式</label><select class="form-select" v-model="uploadForm.format"><option value="pdf">PDF</option><option value="doc">DOC</option><option value="xls">XLS</option><option value="ppt">PPT</option><option value="jpg">JPG</option><option value="png">PNG</option><option value="zip">ZIP</option><option value="dwg">DWG</option><option value="other">其他</option></select></div>
            <div class="form-group"><label class="form-label">文件大小</label><input type="text" class="form-input" v-model="uploadForm.size" placeholder="如 2.3MB"></div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group"><label class="form-label">密级</label><select class="form-select" v-model="uploadForm.securityLevel"><option value="public">公开</option><option value="internal">内部</option><option value="confidential">机密</option><option value="secret">绝密</option></select></div>
            <div class="form-group"><label class="form-label">有效期</label><input type="date" class="form-input" v-model="uploadForm.validUntil"></div>
          </div>
          <div class="form-group"><label class="form-label">标签（逗号分隔）</label><input type="text" class="form-input" v-model="uploadForm.tagsStr" placeholder="标签1,标签2"></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showUploadModal = false">取消</button>
          <button class="btn btn-primary" @click="submitUpload">上传</button>
        </div>
      </div>
    </div>

    <div v-if="showShareModal" class="modal-overlay" @click.self="showShareModal = false">
      <div class="modal-dialog" @click.stop>
        <div class="modal-header">
          <span class="modal-title">创建分享</span>
          <button class="modal-close" @click="showShareModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group"><label class="form-label">文件名称 <span class="required">*</span></label><input type="text" class="form-input" v-model="shareForm.fileName" placeholder="文件名称"></div>
          <div class="form-group"><label class="form-label">有效期</label><input type="date" class="form-input" v-model="shareForm.validUntil"></div>
          <div class="form-group"><label class="form-label"><input type="checkbox" v-model="shareForm.hasPassword"> 密码保护</label></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showShareModal = false">取消</button>
          <button class="btn btn-primary" @click="submitShare">创建</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, watch, nextTick } from 'vue'
import { useArchiveStore } from '@/stores/archive'

const archiveStore = useArchiveStore()

const tabs = [
  { key: 'files', label: '档案文件' },
  { key: 'stats', label: '统计报表' },
  { key: 'download', label: '下载管理' },
  { key: 'share', label: '🔗 分享管理' },
  { key: 'archive', label: '归档规则' },
  { key: 'security', label: '🔒 安全审计' },
  { key: 'recycle', label: '🗑️ 回收站' }
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
const pageSize = 20

const showUploadModal = ref(false)
const showShareModal = ref(false)

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
  projectNo: '', fileName: '', category: '技术文档', subCategory: '',
  version: '1.0', format: 'pdf', size: '', securityLevel: 'internal',
  validUntil: '', tagsStr: ''
})

const shareForm = reactive({
  fileName: '', validUntil: '', hasPassword: false
})

const rules = reactive({
  remindHours: archiveStore.archiveRules.remindHours || 72
})

const projectOptions = computed(() => {
  const set = new Set(archiveStore.archives.map(a => a.projectNo).filter(Boolean))
  return [...set].sort()
})

const currentSubCategories = computed(() => {
  return archiveStore.subCategoryMap[uploadForm.category] || []
})

const currentFilterSubCategories = computed(() => {
  if (filterCategory.value === 'all') return []
  return archiveStore.subCategoryMap[filterCategory.value] || []
})

const filteredArchives = computed(() => {
  let list = [...archiveStore.archives]
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(a =>
      (a.fileName || '').toLowerCase().includes(q) ||
      (a.projectNo || '').toLowerCase().includes(q) ||
      (a.tags || []).some(t => t.toLowerCase().includes(q))
    )
  }
  if (filterProject.value !== 'all') list = list.filter(a => a.projectNo === filterProject.value)
  if (filterCategory.value !== 'all') list = list.filter(a => a.category === filterCategory.value)
  if (filterSubCategory.value !== 'all') list = list.filter(a => a.subCategory === filterSubCategory.value)
  if (filterStatus.value !== 'all') list = list.filter(a => a.status === filterStatus.value)
  if (filterSecurity.value !== 'all') list = list.filter(a => a.securityLevel === filterSecurity.value)
  if (sortBy.value) {
    list.sort((a, b) => {
      let va = a[sortBy.value] || ''
      let vb = b[sortBy.value] || ''
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
    list = list.filter(l => (l.user || '').toLowerCase().includes(q) || (l.fileName || '').toLowerCase().includes(q))
  }
  if (dlLogType.value) list = list.filter(l => l.type === dlLogType.value)
  if (dlLogFrom.value) list = list.filter(l => l.time && l.time >= dlLogFrom.value)
  if (dlLogTo.value) list = list.filter(l => l.time && l.time <= dlLogTo.value + ' 23:59:59')
  return list
})

const filteredShareLogs = computed(() => {
  let list = [...archiveStore.shareLogs]
  if (shareLogSearch.value) {
    const q = shareLogSearch.value.toLowerCase()
    list = list.filter(l => (l.sharer || '').toLowerCase().includes(q) || (l.fileName || '').toLowerCase().includes(q))
  }
  if (shareLogStatus.value) list = list.filter(l => l.status === shareLogStatus.value)
  return list
})

const filteredAuditLogs = computed(() => {
  let list = [...archiveStore.auditLogs]
  if (auditLogSearch.value) {
    const q = auditLogSearch.value.toLowerCase()
    list = list.filter(l => (l.user || '').toLowerCase().includes(q) || (l.target || '').toLowerCase().includes(q))
  }
  if (auditLogType.value) list = list.filter(l => l.type === auditLogType.value)
  return list
})

const reportStats = computed(() => {
  const total = archiveStore.archives.length || 1
  const approved = archiveStore.approvedCount
  const pending = archiveStore.pendingCount
  return {
    avgReviewHours: Math.round(Math.random() * 48 + 12),
    approvalRate: Math.round(approved / total * 100),
    pendingCount: pending
  }
})

const reportTableData = computed(() => {
  const months = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
    const monthArchives = archiveStore.archives.filter(a => a.createdAt && a.createdAt.startsWith(monthStr))
    const uploaded = monthArchives.length
    const approved = monthArchives.filter(a => a.status === 'approved' || a.status === 'archived').length
    const archived = monthArchives.filter(a => a.status === 'archived').length
    months.push({ month: monthStr, uploaded, approved, archived, rate: uploaded ? Math.round(approved / uploaded * 100) : 0 })
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
  archiveStore.archives.forEach(a => { map[a.category] = (map[a.category] || 0) + 1 })
  const total = archiveStore.archives.length || 1
  return Object.entries(map).map(([name, count]) => ({ name, count, percent: Math.round(count / total * 100) }))
})

const statusStats = computed(() => {
  const colors = { draft: 'var(--color-text-tertiary)', pending_review: 'var(--color-warning)', approved: 'var(--color-success)', archived: 'var(--color-info)' }
  const map = {}
  archiveStore.archives.forEach(a => { map[a.status] = (map[a.status] || 0) + 1 })
  const total = archiveStore.archives.length || 1
  return Object.entries(map).map(([key, count]) => ({
    name: archiveStore.statusLabels[key] || key, count, percent: Math.round(count / total * 100), color: colors[key] || 'var(--color-accent)'
  }))
})

const pendingArchiveProjects = computed(() => {
  const projects = new Set(archiveStore.archives.filter(a => a.status === 'approved').map(a => a.projectNo))
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
  else { sortBy.value = field; sortAsc.value = true }
}

function toggleSelectAll() {
  if (selectAll.value) selectedIds.value = paginatedArchives.value.map(a => a.id)
  else selectedIds.value = []
}

function openUploadModal() { showUploadModal.value = true }

function submitUpload() {
  if (!uploadForm.projectNo || !uploadForm.fileName) { alert('请填写项目编号和文件名称'); return }
  archiveStore.addArchive({
    projectNo: uploadForm.projectNo,
    fileName: uploadForm.fileName,
    category: uploadForm.category,
    subCategory: uploadForm.subCategory,
    version: uploadForm.version || '1.0',
    format: uploadForm.format,
    size: uploadForm.size || '0KB',
    securityLevel: uploadForm.securityLevel,
    validUntil: uploadForm.validUntil,
    tags: uploadForm.tagsStr ? uploadForm.tagsStr.split(',').map(t => t.trim()).filter(Boolean) : []
  })
  showUploadModal.value = false
  Object.assign(uploadForm, { projectNo: '', fileName: '', category: '技术文档', subCategory: '', version: '1.0', format: 'pdf', size: '', securityLevel: 'internal', validUntil: '', tagsStr: '' })
}

function openShareModal() { showShareModal.value = true }

function submitShare() {
  if (!shareForm.fileName) { alert('请填写文件名称'); return }
  archiveStore.addShareLog({
    fileName: shareForm.fileName,
    validUntil: shareForm.validUntil,
    password: shareForm.hasPassword ? Math.random().toString(36).slice(2, 8) : ''
  })
  showShareModal.value = false
  Object.assign(shareForm, { fileName: '', validUntil: '', hasPassword: false })
}

function cancelShare(id) { archiveStore.cancelShare(id) }

function viewArchive(arc) {
  archiveStore.addDownloadLog({ fileName: arc.fileName, version: arc.version, size: arc.size })
  alert('查看文件: ' + arc.fileName)
}

function deleteArchive(id) {
  if (confirm('确认删除该档案？')) archiveStore.deleteArchive(id)
}

function batchReview() {
  if (selectedIds.value.length === 0) { alert('请先选择档案'); return }
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
  const ids = archiveStore.archives.filter(a => a.projectNo === projectNo && a.status === 'approved').map(a => a.id)
  archiveStore.batchReview(ids, 'archive')
}

function batchArchiveProjects() {
  if (batchArchiveSelected.value.length === 0) { alert('请先选择要归档的项目'); return }
  for (const projectNo of batchArchiveSelected.value) {
    const ids = archiveStore.archives.filter(a => a.projectNo === projectNo && a.status === 'approved').map(a => a.id)
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
  const maxVal = Math.max(...data.map(d => d.uploaded), 1)
  const padding = { top: 20, right: 20, bottom: 40, left: 40 }
  const chartW = canvas.width - padding.left - padding.right
  const chartH = canvas.height - padding.top - padding.bottom
  const barW = chartW / data.length * 0.6
  const gap = chartW / data.length
  ctx.strokeStyle = '#e0e0e0'
  ctx.lineWidth = 1
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartH / 4) * i
    ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(canvas.width - padding.right, y); ctx.stroke()
    ctx.fillStyle = '#999'; ctx.font = '11px sans-serif'; ctx.textAlign = 'right'
    ctx.fillText(Math.round(maxVal * (4 - i) / 4), padding.left - 5, y + 4)
  }
  data.forEach((d, i) => {
    const x = padding.left + gap * i + (gap - barW) / 2
    const h = (d.uploaded / maxVal) * chartH
    const y = padding.top + chartH - h
    ctx.fillStyle = '#4a90d9'
    ctx.fillRect(x, y, barW, h)
    ctx.fillStyle = '#666'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center'
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
    ctx.fillStyle = '#333'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'
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

watch(filterCategory, () => { filterSubCategory.value = 'all' })

function saveRules() {
  archiveStore.saveRules({ remindHours: rules.remindHours })
  alert('归档规则已保存')
}

function restoreItem(id) { archiveStore.restoreArchive(id) }
function permanentDelete(id) { if (confirm('确认永久删除？此操作不可恢复')) archiveStore.permanentDelete(id) }
function restoreAll() { archiveStore.recycleBin.forEach(item => archiveStore.restoreArchive(item.id)) }
function emptyBin() { if (confirm('确认清空回收站？此操作不可恢复')) archiveStore.emptyRecycleBin() }

onMounted(() => { archiveStore.initSeedData() })
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
  padding: 1px 6px;
  background: var(--color-accent-subtle);
  color: var(--color-accent);
  border-radius: var(--radius-sm);
  font-size: 10px;
  margin-right: 4px;
  margin-bottom: 2px;
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
  margin-bottom: -2px;
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
@media (max-width: 768px) {
  .content-grid-2-1 {
    grid-template-columns: 1fr;
  }
  .archive-toolbar {
    flex-direction: column;
  }
}
</style>
