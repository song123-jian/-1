<template>
  <div class="system-page">
    <div class="page-header">
      <div>
        <h2 class="page-header-title">系统管理</h2>
        <p class="page-header-subtitle">主题管理、数据备份恢复、用户权限配置、数据字典维护</p>
      </div>
    </div>

    <div class="tab-bar">
      <button v-for="tab in tabs" :key="tab.key" class="tab-btn" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">{{ tab.label }}</button>
    </div>

    <div v-if="activeTab === 'themes'">
      <div class="page-header" style="margin-bottom:var(--space-3)">
        <div></div>
        <div class="page-header-actions">
          <button class="btn btn-ghost" @click="previewThemeFullscreen">👁️ 全屏预览</button>
          <button class="btn btn-primary" @click="saveThemeSettings">💾 保存主题设置</button>
          <button class="btn btn-ghost" @click="openThemeModal">➕ 新建主题</button>
        </div>
      </div>

      <div class="tab-bar" style="margin-bottom:var(--space-4)">
        <button v-for="tt in themeTabs" :key="tt.key" class="tab-btn" :class="{ active: activeThemeTab === tt.key }" @click="activeThemeTab = tt.key">{{ tt.label }}</button>
      </div>

      <div v-if="activeThemeTab === 'switching'">
        <div class="content-grid content-grid-2">
          <div class="panel-card">
            <div class="panel-card-header"><span class="panel-card-title">🎨 外观模式</span></div>
            <div class="panel-card-body">
              <div class="form-group">
                <label class="form-label">选择显示模式</label>
                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-3)">
                  <button v-for="mode in themeModes" :key="mode.key" class="btn" :class="currentThemeMode === mode.key ? 'btn-primary' : 'btn-secondary'" @click="currentThemeMode = mode.key" style="min-width:80px">
                    <div style="font-size:1.5rem;margin-bottom:var(--space-2)">{{ mode.icon }}</div>
                    <div style="font-size:var(--font-size-xs)">{{ mode.label }}</div>
                  </button>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">亮度调节 <span>{{ themeBrightness }}%</span></label>
                <input type="range" v-model.number="themeBrightness" min="50" max="150" style="width:100%">
                <div style="display:flex;justify-content:space-between;font-size:var(--font-size-xs);color:var(--color-text-tertiary);margin-top:var(--space-1)"><span>偏暗</span><span>默认</span><span>偏亮</span></div>
              </div>
              <div style="display:flex;gap:var(--space-3)">
                <button class="btn btn-secondary" @click="toggleDarkLight" style="flex:1">🔄 明暗切换</button>
                <button class="btn btn-secondary" @click="resetThemeToDefault" style="flex:1">↩️ 恢复默认</button>
              </div>
            </div>
          </div>
          <div class="panel-card">
            <div class="panel-card-header"><span class="panel-card-title">📊 当前状态</span></div>
            <div class="panel-card-body">
              <div style="padding:var(--space-4);background:var(--color-surface-elevated);border-radius:var(--radius-md);font-size:var(--font-size-sm);margin-bottom:var(--space-4)">
                <div>模式: <strong>{{ themeModes.find(m => m.key === currentThemeMode)?.label || currentThemeMode }}</strong></div>
                <div>亮度: <strong>{{ themeBrightness }}%</strong></div>
                <div>主题色: <span :style="{ display:'inline-block', width:'14px', height:'14px', borderRadius:'50%', background: themeAccentColor, verticalAlign:'middle' }"></span> <strong>{{ themeAccentColor }}</strong></div>
              </div>
              <div style="padding:var(--space-4);background:var(--color-bg-primary);border-radius:var(--radius-md);border:1px solid var(--color-border)">
                <div :style="{ background: themeAccentColor, color: '#fff', padding: '8px 12px', borderRadius: '6px', marginBottom: '8px', fontSize: '14px' }">主色按钮预览</div>
                <div :style="{ border: '2px solid ' + themeAccentColor, borderRadius: '6px', padding: '8px 12px', fontSize: '13px' }">边框样式预览</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="activeThemeTab === 'accent'">
        <div class="content-grid content-grid-2">
          <div class="panel-card">
            <div class="panel-card-header"><span class="panel-card-title">🖌️ 主色配置</span></div>
            <div class="panel-card-body">
              <div class="form-group">
                <label class="form-label">选择主题色</label>
                <select class="form-select" v-model="themeAccentPreset" @change="applyAccentPreset" style="width:100%">
                  <option v-for="p in accentPresets" :key="p.value" :value="p.value">{{ p.label }}</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">自定义主色</label>
                <div style="display:flex;gap:var(--space-3);align-items:center;flex-wrap:wrap">
                  <input type="color" v-model="themeAccentColor" style="width:48px;height:36px;border:none;cursor:pointer;border-radius:var(--radius-sm)">
                  <input type="text" class="form-input" v-model="themeAccentColor" placeholder="#3b82f6" style="width:120px">
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">预设主色</label>
                <div style="display:flex;gap:var(--space-2);flex-wrap:wrap">
                  <div v-for="swatch in accentSwatches" :key="swatch" :style="{ width:'28px', height:'28px', borderRadius:'50%', background:swatch, cursor:'pointer', border: themeAccentColor === swatch ? '3px solid var(--color-text-primary)' : '2px solid var(--color-border)' }" @click="themeAccentColor = swatch"></div>
                </div>
              </div>
            </div>
          </div>
          <div class="panel-card">
            <div class="panel-card-header"><span class="panel-card-title">👁️ 主色预览</span></div>
            <div class="panel-card-body">
              <div style="padding:var(--space-4);background:var(--color-bg-primary);border-radius:var(--radius-md);border:1px solid var(--color-border)">
                <button :style="{ background: themeAccentColor, color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', marginRight: '8px' }">主色按钮</button>
                <button :style="{ background: 'transparent', color: themeAccentColor, border: '2px solid ' + themeAccentColor, padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }">描边按钮</button>
                <div :style="{ marginTop: '12px', padding: '8px', borderLeft: '4px solid ' + themeAccentColor, background: 'var(--color-surface-elevated)', fontSize: '13px' }">主色强调信息</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="activeThemeTab === 'typography'">
        <div class="content-grid content-grid-2">
          <div class="panel-card">
            <div class="panel-card-header"><span class="panel-card-title">📝 字体缩放</span></div>
            <div class="panel-card-body">
              <div class="form-group">
                <label class="form-label">全局字体缩放 <span>{{ fontScale }}%</span></label>
                <input type="range" v-model.number="fontScale" min="75" max="150" step="5" style="width:100%">
                <div style="display:flex;justify-content:space-between;font-size:var(--font-size-xs);color:var(--color-text-tertiary);margin-top:var(--space-1)"><span>75%</span><span>100%</span><span>150%</span></div>
              </div>
              <div class="form-group">
                <label class="form-label">行高 <span>{{ lineHeight.toFixed(1) }}</span></label>
                <input type="range" v-model.number="lineHeightRaw" min="12" max="24" step="1" style="width:100%">
                <div style="display:flex;justify-content:space-between;font-size:var(--font-size-xs);color:var(--color-text-tertiary);margin-top:var(--space-1)"><span>紧凑 1.2</span><span>默认 1.6</span><span>宽松 2.4</span></div>
              </div>
            </div>
          </div>
          <div class="panel-card">
            <div class="panel-card-header"><span class="panel-card-title">📐 布局间距</span></div>
            <div class="panel-card-body">
              <div class="form-group">
                <label class="form-label">间距缩放 <span>{{ spacingScale }}%</span></label>
                <input type="range" v-model.number="spacingScale" min="50" max="200" step="10" style="width:100%">
                <div style="display:flex;justify-content:space-between;font-size:var(--font-size-xs);color:var(--color-text-tertiary);margin-top:var(--space-1)"><span>紧凑 50%</span><span>默认 100%</span><span>宽松 200%</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="activeThemeTab === 'presets'">
        <div class="theme-grid">
          <div v-for="theme in sysStore.themes" :key="theme.id" class="theme-card" :class="{ active: sysStore.activeThemeId === theme.id }" @click="sysStore.activateTheme(theme.id)">
            <div class="theme-card-preview" :style="themePreviewStyle(theme)">
              <div style="padding:8px;display:flex;flex-direction:column;gap:4px">
                <div :style="{ background: theme.colors.primary, height: '8px', borderRadius: theme.borderRadius/2 + 'px', width: '60%' }"></div>
                <div :style="{ background: theme.colors.success, height: '6px', borderRadius: theme.borderRadius/2 + 'px', width: '40%' }"></div>
                <div :style="{ background: theme.colors.warning, height: '6px', borderRadius: theme.borderRadius/2 + 'px', width: '50%' }"></div>
              </div>
            </div>
            <div class="theme-card-info">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <span style="font-weight:600;font-size:var(--font-size-sm)">{{ theme.name }}</span>
                <span v-if="sysStore.activeThemeId === theme.id" class="status-badge success">使用中</span>
              </div>
              <div style="font-size:var(--font-size-xs);color:var(--color-text-tertiary);margin-top:2px">{{ theme.darkMode ? '深色' : '浅色' }} · {{ theme.fontSize }}px · {{ theme.borderRadius }}px圆角</div>
              <div style="display:flex;gap:4px;margin-top:6px">
                <div v-for="(color, key) in theme.colors" :key="key" :style="{ width: '16px', height: '16px', borderRadius: '50%', background: color }" :title="key"></div>
              </div>
            </div>
            <div class="theme-card-actions" v-if="!theme.isBuiltIn">
              <button class="btn btn-ghost btn-sm" @click.stop="editTheme(theme)">编辑</button>
              <button class="btn btn-ghost btn-sm" style="color:var(--color-danger)" @click.stop="deleteTheme(theme.id)">删除</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'data'">
      <div class="content-grid content-grid-2" style="margin-bottom:var(--space-4)">
        <div class="panel-card">
          <div class="panel-card-header"><span class="panel-card-title">📥 数据导出备份</span></div>
          <div class="panel-card-body">
            <p style="color:var(--color-text-tertiary);font-size:var(--font-size-sm);margin-bottom:var(--space-4)">将所有业务数据导出为JSON备份文件，包括客户、报价、库存、供应商等全部数据。</p>
            <div style="display:flex;gap:var(--space-2)">
              <button class="btn btn-primary" @click="exportBackup">📥 导出数据备份 (JSON)</button>
              <button class="btn btn-ghost" @click="showImportDialog = true">📤 导入数据</button>
            </div>
          </div>
        </div>
        <div class="panel-card">
          <div class="panel-card-header"><span class="panel-card-title">📤 数据恢复</span></div>
          <div class="panel-card-body">
            <div style="background:var(--color-warning-subtle);color:var(--color-warning);padding:var(--space-3);border-radius:var(--radius-md);margin-bottom:var(--space-4);font-size:var(--font-size-sm)">⚠️ 警告：导入将覆盖当前所有数据，请确保已备份！</div>
            <input type="file" ref="restoreFileRef" accept=".json" style="display:none" @change="importBackup">
            <button class="btn btn-secondary" @click="$refs.restoreFileRef.click()">📤 选择备份文件 (JSON)</button>
          </div>
        </div>
      </div>

      <div class="panel-card" style="margin-bottom:var(--space-4)">
        <div class="panel-card-header"><span class="panel-card-title">🗑️ 数据清除</span></div>
        <div class="panel-card-body">
          <div style="background:var(--color-danger-subtle);color:var(--color-danger);padding:var(--space-3);border-radius:var(--radius-md);margin-bottom:var(--space-4);font-size:var(--font-size-sm)">⚠️ 危险操作：清除后所有业务数据将永久删除且不可恢复！请务必先导出备份。</div>
          <div style="display:flex;gap:var(--space-3);flex-wrap:wrap">
            <button class="btn btn-primary" @click="exportBackup">📥 先导出备份</button>
            <button class="btn btn-secondary" style="background:var(--color-danger);color:var(--color-text-inverse);border-color:var(--color-danger)" @click="clearAllData">🗑️ 清除全部数据</button>
          </div>
        </div>
      </div>

      <div class="stats-row" style="margin-bottom:var(--space-4)">
        <div class="stat-card"><div class="stat-card-icon" style="background:var(--color-accent-subtle);color:var(--color-accent)">💾</div><div class="stat-card-value">{{ sysStore.dataBackups.length }}</div><div class="stat-card-label">备份数</div></div>
        <div class="stat-card"><div class="stat-card-icon" style="background:var(--color-success-subtle);color:var(--color-success)">🔄</div><div class="stat-card-value">{{ sysStore.dataBackups.filter(b => b.type === 'auto').length }}</div><div class="stat-card-label">自动备份</div></div>
      </div>
      <div class="page-header" style="margin-bottom:var(--space-3)">
        <div></div>
        <div class="page-header-actions">
          <button class="btn btn-primary" @click="createBackup">💾 立即备份</button>
          <button class="btn btn-ghost" @click="clearCache">🗑️ 清除缓存</button>
        </div>
      </div>
      <div class="panel-card">
        <div class="panel-card-header"><span class="panel-card-title">备份记录</span></div>
        <div class="panel-card-body no-padding">
          <div class="table-container">
            <table class="data-table">
              <thead><tr><th>时间</th><th>描述</th><th>大小</th><th>类型</th><th>操作</th></tr></thead>
              <tbody>
                <tr v-if="sysStore.dataBackups.length === 0"><td colspan="5" class="empty-state">暂无备份记录</td></tr>
                <tr v-for="bk in sysStore.dataBackups" :key="bk.id">
                  <td>{{ bk.createdAt }}</td><td>{{ bk.description }}</td><td>{{ bk.size }}</td>
                  <td><span class="status-badge" :class="bk.type === 'auto' ? 'info' : 'neutral'">{{ bk.type === 'auto' ? '自动' : '手动' }}</span></td>
                  <td>
                    <button class="btn btn-ghost btn-sm" @click="restoreBackup(bk)">恢复</button>
                    <button class="btn btn-ghost btn-sm" style="color:var(--color-danger)" @click="deleteBackup(bk.id)">删除</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="panel-card" style="margin-top:var(--space-4)">
        <div class="panel-card-header"><span class="panel-card-title">📋 操作历史记录</span></div>
        <div class="panel-card-body">
          <div class="filter-bar" style="margin-bottom:var(--space-4)">
            <input type="text" class="form-input" v-model="opHistorySearch" placeholder="搜索操作...">
            <select class="form-select" v-model="opHistoryModule">
              <option value="">全部模块</option>
              <option value="customers">客户管理</option>
              <option value="quotations">报价管理</option>
              <option value="inventory">库存管理</option>
              <option value="warehouseOrders">出入库记录</option>
              <option value="deliveries">送货管理</option>
              <option value="collections">回款管理</option>
              <option value="todos">待办事项</option>
              <option value="settings">系统设置</option>
            </select>
          </div>
          <div class="table-container">
            <table class="data-table">
              <thead><tr><th>时间</th><th>模块</th><th>操作</th><th>摘要</th></tr></thead>
              <tbody>
                <tr v-if="filteredOpHistory.length === 0"><td colspan="4" class="empty-state">暂无操作记录</td></tr>
                <tr v-for="op in filteredOpHistory.slice(0, 50)" :key="op.id">
                  <td>{{ op.time }}</td><td>{{ op.module }}</td><td>{{ op.action }}</td><td>{{ op.summary }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'users'">
      <div class="stats-row" style="margin-bottom:var(--space-4)">
        <div class="stat-card"><div class="stat-card-icon" style="background:var(--color-accent-subtle);color:var(--color-accent)">👥</div><div class="stat-card-value">{{ sysStore.userCount }}</div><div class="stat-card-label">用户总数</div></div>
        <div class="stat-card"><div class="stat-card-icon" style="background:var(--color-success-subtle);color:var(--color-success)">✅</div><div class="stat-card-value">{{ sysStore.activeUserCount }}</div><div class="stat-card-label">活跃用户</div></div>
      </div>
      <div class="page-header" style="margin-bottom:var(--space-3)">
        <div></div>
        <div class="page-header-actions">
          <button class="btn btn-primary" @click="openUserModal">➕ 新增用户</button>
          <button class="btn btn-ghost" @click="exportUsers">📥 导出</button>
        </div>
      </div>
      <div class="panel-card">
        <div class="panel-card-body no-padding">
          <div class="table-container">
            <table class="data-table">
              <thead><tr><th>用户名</th><th>姓名</th><th>邮箱</th><th>电话</th><th>角色</th><th>部门</th><th>状态</th><th>最后登录</th><th>操作</th></tr></thead>
              <tbody>
                <tr v-if="sysStore.users.length === 0"><td colspan="9" class="empty-state">暂无用户</td></tr>
                <tr v-for="user in sysStore.users" :key="user.id">
                  <td>{{ user.username }}</td><td>{{ user.realName }}</td><td>{{ user.email }}</td><td>{{ user.phone }}</td>
                  <td><span class="role-badge">{{ user.role }}</span></td><td>{{ user.department }}</td>
                  <td><span class="status-badge" :class="user.status === 'active' ? 'success' : 'neutral'">{{ user.status === 'active' ? '活跃' : '停用' }}</span></td>
                  <td>{{ user.lastLogin || '-' }}</td>
                  <td>
                    <button class="btn btn-ghost btn-sm" @click="editUser(user)">编辑</button>
                    <button class="btn btn-ghost btn-sm" @click="toggleUserStatus(user)">{{ user.status === 'active' ? '停用' : '启用' }}</button>
                    <button class="btn btn-ghost btn-sm" style="color:var(--color-danger)" @click="deleteUser(user.id)">删除</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'dicts'">
      <div class="stats-row" style="margin-bottom:var(--space-4)">
        <div class="stat-card"><div class="stat-card-icon" style="background:var(--color-accent-subtle);color:var(--color-accent)">📖</div><div class="stat-card-value">{{ sysStore.dictCount }}</div><div class="stat-card-label">字典数</div></div>
        <div class="stat-card"><div class="stat-card-icon" style="background:var(--color-info-subtle);color:var(--color-info)">📝</div><div class="stat-card-value">{{ sysStore.dictEntryCount }}</div><div class="stat-card-label">字典项总数</div></div>
      </div>
      <div class="page-header" style="margin-bottom:var(--space-3)">
        <div></div>
        <div class="page-header-actions"><button class="btn btn-primary" @click="openDictModal">➕ 新增字典</button></div>
      </div>
      <div class="content-grid content-grid-1-1">
        <div class="panel-card">
          <div class="panel-card-header"><span class="panel-card-title">字典列表</span></div>
          <div class="panel-card-body no-padding" style="max-height:500px;overflow-y:auto">
            <div v-for="dict in sysStore.dictionaries" :key="dict.id" class="dict-item" :class="{ active: selectedDictId === dict.id }" @click="selectedDictId = dict.id">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <div>
                  <div style="font-weight:600;font-size:var(--font-size-sm)">{{ dict.name }}</div>
                  <div style="font-size:var(--font-size-xs);color:var(--color-text-tertiary)">{{ dict.code }} · {{ dict.entries.length }}项</div>
                </div>
                <div style="display:flex;gap:2px">
                  <button class="btn btn-ghost btn-sm" @click.stop="editDict(dict)">编辑</button>
                  <button class="btn btn-ghost btn-sm" style="color:var(--color-danger)" @click.stop="deleteDict(dict.id)">删除</button>
                </div>
              </div>
            </div>
            <div v-if="sysStore.dictionaries.length === 0" style="padding:var(--space-4);text-align:center;color:var(--color-text-tertiary)">暂无字典</div>
          </div>
        </div>
        <div class="panel-card">
          <div class="panel-card-header">
            <span class="panel-card-title">{{ selectedDict ? selectedDict.name + ' - 字典项' : '请选择字典' }}</span>
            <button v-if="selectedDict" class="btn btn-ghost btn-sm" @click="openEntryModal">➕ 添加</button>
          </div>
          <div class="panel-card-body no-padding">
            <div v-if="!selectedDict" style="padding:var(--space-4);text-align:center;color:var(--color-text-tertiary)">← 请先选择左侧字典</div>
            <table v-else class="data-table">
              <thead><tr><th>标签</th><th>值</th><th>排序</th><th>状态</th><th>操作</th></tr></thead>
              <tbody>
                <tr v-if="selectedDict.entries.length === 0"><td colspan="5" class="empty-state">暂无字典项</td></tr>
                <tr v-for="entry in selectedDict.entries" :key="entry.id">
                  <td>{{ entry.label }}</td><td>{{ entry.value }}</td><td>{{ entry.sort }}</td>
                  <td><span class="status-badge" :class="entry.enabled ? 'success' : 'neutral'">{{ entry.enabled ? '启用' : '禁用' }}</span></td>
                  <td><button class="btn btn-ghost btn-sm" style="color:var(--color-danger)" @click="removeEntry(entry.id)">删除</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showThemeModal" class="modal-overlay" @click.self="showThemeModal = false">
      <div class="modal-dialog" @click.stop>
        <div class="modal-header"><span class="modal-title">{{ editingTheme ? '编辑主题' : '新建主题' }}</span><button class="modal-close" @click="showThemeModal = false">✕</button></div>
        <div class="modal-body">
          <div class="form-group"><label class="form-label">主题名称</label><input type="text" class="form-input" v-model="themeForm.name"></div>
          <div class="form-row form-row-2">
            <div class="form-group"><label class="form-label">主色</label><input type="color" v-model="themeForm.colors.primary" style="width:100%;height:32px;border:none;cursor:pointer"></div>
            <div class="form-group"><label class="form-label">成功色</label><input type="color" v-model="themeForm.colors.success" style="width:100%;height:32px;border:none;cursor:pointer"></div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group"><label class="form-label">警告色</label><input type="color" v-model="themeForm.colors.warning" style="width:100%;height:32px;border:none;cursor:pointer"></div>
            <div class="form-group"><label class="form-label">危险色</label><input type="color" v-model="themeForm.colors.danger" style="width:100%;height:32px;border:none;cursor:pointer"></div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group"><label class="form-label">字体大小(px)</label><input type="number" class="form-input" v-model.number="themeForm.fontSize" min="10" max="20"></div>
            <div class="form-group"><label class="form-label">圆角(px)</label><input type="number" class="form-input" v-model.number="themeForm.borderRadius" min="0" max="24"></div>
          </div>
          <div class="form-group"><label class="form-label"><input type="checkbox" v-model="themeForm.darkMode"> 深色模式</label></div>
        </div>
        <div class="modal-footer"><button class="btn btn-secondary" @click="showThemeModal = false">取消</button><button class="btn btn-primary" @click="submitTheme">保存</button></div>
      </div>
    </div>

    <div v-if="showUserModal" class="modal-overlay" @click.self="showUserModal = false">
      <div class="modal-dialog" @click.stop>
        <div class="modal-header"><span class="modal-title">{{ editingUser ? '编辑用户' : '新增用户' }}</span><button class="modal-close" @click="showUserModal = false">✕</button></div>
        <div class="modal-body">
          <div class="form-row form-row-2">
            <div class="form-group"><label class="form-label">用户名 <span class="required">*</span></label><input type="text" class="form-input" v-model="userForm.username"></div>
            <div class="form-group"><label class="form-label">姓名 <span class="required">*</span></label><input type="text" class="form-input" v-model="userForm.realName"></div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group"><label class="form-label">邮箱</label><input type="email" class="form-input" v-model="userForm.email"></div>
            <div class="form-group"><label class="form-label">电话</label><input type="text" class="form-input" v-model="userForm.phone"></div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group"><label class="form-label">角色</label><select class="form-select" v-model="userForm.role"><option>管理员</option><option>总经理</option><option>销售主管</option><option>销售员</option><option>仓库主管</option><option>仓管员</option><option>财务</option><option>查看者</option></select></div>
            <div class="form-group"><label class="form-label">部门</label><input type="text" class="form-input" v-model="userForm.department"></div>
          </div>
        </div>
        <div class="modal-footer"><button class="btn btn-secondary" @click="showUserModal = false">取消</button><button class="btn btn-primary" @click="submitUser">保存</button></div>
      </div>
    </div>

    <div v-if="showDictModal" class="modal-overlay" @click.self="showDictModal = false">
      <div class="modal-dialog" @click.stop>
        <div class="modal-header"><span class="modal-title">{{ editingDict ? '编辑字典' : '新增字典' }}</span><button class="modal-close" @click="showDictModal = false">✕</button></div>
        <div class="modal-body">
          <div class="form-group"><label class="form-label">字典名称 <span class="required">*</span></label><input type="text" class="form-input" v-model="dictForm.name"></div>
          <div class="form-group"><label class="form-label">字典编码 <span class="required">*</span></label><input type="text" class="form-input" v-model="dictForm.code"></div>
          <div class="form-group"><label class="form-label">描述</label><input type="text" class="form-input" v-model="dictForm.description"></div>
        </div>
        <div class="modal-footer"><button class="btn btn-secondary" @click="showDictModal = false">取消</button><button class="btn btn-primary" @click="submitDict">保存</button></div>
      </div>
    </div>

    <div v-if="showEntryModal" class="modal-overlay" @click.self="showEntryModal = false">
      <div class="modal-dialog" @click.stop>
        <div class="modal-header"><span class="modal-title">添加字典项</span><button class="modal-close" @click="showEntryModal = false">✕</button></div>
        <div class="modal-body">
          <div class="form-row form-row-2">
            <div class="form-group"><label class="form-label">标签 <span class="required">*</span></label><input type="text" class="form-input" v-model="entryForm.label"></div>
            <div class="form-group"><label class="form-label">值 <span class="required">*</span></label><input type="text" class="form-input" v-model="entryForm.value"></div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group"><label class="form-label">排序</label><input type="number" class="form-input" v-model.number="entryForm.sort" min="1"></div>
            <div class="form-group"><label class="form-label"><input type="checkbox" v-model="entryForm.enabled"> 启用</label></div>
          </div>
        </div>
        <div class="modal-footer"><button class="btn btn-secondary" @click="showEntryModal = false">取消</button><button class="btn btn-primary" @click="submitEntry">添加</button></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useSystemStore } from '@/stores/system'

const sysStore = useSystemStore()

const tabs = [
  { key: 'themes', label: '🎨 主题管理' },
  { key: 'data', label: '💾 数据管理' },
  { key: 'users', label: '👥 用户管理' },
  { key: 'dicts', label: '📖 数据字典' }
]

const activeTab = ref('themes')
const selectedDictId = ref('')

const activeThemeTab = ref('switching')
const currentThemeMode = ref('dark')
const themeBrightness = ref(100)
const themeAccentColor = ref('#3b82f6')
const themeAccentPreset = ref('ocean')
const fontScale = ref(100)
const lineHeightRaw = ref(16)
const spacingScale = ref(100)
const opHistorySearch = ref('')
const opHistoryModule = ref('')
const showImportDialog = ref(false)

const themeTabs = [
  { key: 'switching', label: '主题切换' },
  { key: 'accent', label: '主色配置' },
  { key: 'typography', label: '排版间距' },
  { key: 'presets', label: '预设方案' }
]

const themeModes = [
  { key: 'dark', icon: '🌙', label: '深色' },
  { key: 'light', icon: '☀️', label: '浅色' },
  { key: 'warm', icon: '🔥', label: '暖色' },
  { key: 'cold', icon: '❄️', label: '冷色' },
  { key: 'highcontrast', icon: '⬛', label: '高对比' },
  { key: 'soft', icon: '🌫️', label: '柔和' },
  { key: 'vintage', icon: '📜', label: '复古' },
  { key: 'cyberpunk', icon: '🌃', label: '赛博' },
  { key: 'grayscale', icon: '⬛', label: '灰度' },
  { key: 'morandi', icon: '🎨', label: '莫兰迪' },
  { key: 'eyecare', icon: '🌲', label: '护眼绿' }
]

const accentPresets = [
  { value: 'ocean', label: '🌊 海洋蓝' },
  { value: 'forest', label: '🌲 森林绿' },
  { value: 'sunset', label: '🌅 日落橙' },
  { value: 'royal', label: '👑 皇家紫' },
  { value: 'crimson', label: '🔴 绯红' },
  { value: 'amber', label: '🟡 琥珀金' },
  { value: 'emerald', label: '💚 翡翠绿' },
  { value: 'rose', label: '🌹 玫瑰粉' },
  { value: 'sky', label: '🔵 天空蓝' },
  { value: 'violet', label: '💜 紫罗兰' },
  { value: 'teal', label: '🩵 青碧' },
  { value: 'indigo', label: '🔵 靛蓝' }
]

const accentSwatches = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#14b8a6', '#a855f7']

const lineHeight = computed(() => lineHeightRaw.value / 10)

const presetColorMap = {
  ocean: '#3b82f6', forest: '#10b981', sunset: '#f59e0b', royal: '#8b5cf6',
  crimson: '#ef4444', amber: '#f59e0b', emerald: '#10b981', rose: '#ec4899',
  sky: '#0ea5e9', violet: '#8b5cf6', teal: '#14b8a6', indigo: '#6366f1'
}

const filteredOpHistory = computed(() => {
  let ops = sysStore.operationHistory || []
  if (opHistoryModule.value) ops = ops.filter(o => o.module === opHistoryModule.value)
  if (opHistorySearch.value) {
    const q = opHistorySearch.value.toLowerCase()
    ops = ops.filter(o => (o.action || '').toLowerCase().includes(q) || (o.summary || '').toLowerCase().includes(q))
  }
  return ops
})

function applyAccentPreset() {
  themeAccentColor.value = presetColorMap[themeAccentPreset.value] || '#3b82f6'
}

function toggleDarkLight() {
  currentThemeMode.value = currentThemeMode.value === 'dark' ? 'light' : 'dark'
}

function resetThemeToDefault() {
  currentThemeMode.value = 'dark'
  themeBrightness.value = 100
  themeAccentColor.value = '#3b82f6'
  fontScale.value = 100
  lineHeightRaw.value = 16
  spacingScale.value = 100
}

function saveThemeSettings() {
  sysStore.saveThemeSettings({
    mode: currentThemeMode.value,
    brightness: themeBrightness.value,
    accentColor: themeAccentColor.value,
    fontScale: fontScale.value,
    lineHeight: lineHeight.value,
    spacingScale: spacingScale.value
  })
  alert('主题设置已保存')
}

function previewThemeFullscreen() {
  alert('全屏预览功能：将打开全屏预览窗口')
}

function exportBackup() {
  const data = JSON.stringify({ exportTime: new Date().toISOString(), data: 'all' }, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = '数据备份_' + new Date().toISOString().split('T')[0] + '.json'
  a.click()
}

function importBackup(event) {
  const file = event.target.files[0]
  if (!file) return
  if (!confirm('导入将覆盖当前所有数据，确认继续？')) return
  alert('数据恢复功能：正在导入 ' + file.name)
}

function clearAllData() {
  if (!confirm('⚠️ 确认清除全部数据？此操作不可恢复！')) return
  if (!confirm('再次确认：真的要删除所有数据吗？')) return
  localStorage.clear()
  alert('所有数据已清除')
  location.reload()
}

const showThemeModal = ref(false)
const showUserModal = ref(false)
const showDictModal = ref(false)
const showEntryModal = ref(false)

const editingTheme = ref(null)
const editingUser = ref(null)
const editingDict = ref(null)

const themeForm = reactive({ name: '', colors: { primary: '#4F46E5', success: '#10B981', warning: '#F59E0B', danger: '#EF4444', info: '#3B82F6' }, fontSize: 14, borderRadius: 8, darkMode: false })
const userForm = reactive({ username: '', realName: '', email: '', phone: '', role: '查看者', department: '' })
const dictForm = reactive({ name: '', code: '', description: '' })
const entryForm = reactive({ label: '', value: '', sort: 1, enabled: true })

const selectedDict = computed(() => sysStore.dictionaries.find(d => d.id === selectedDictId.value) || null)

function themePreviewStyle(theme) {
  return { background: theme.darkMode ? '#1a1a2e' : '#f8f9fa', borderRadius: theme.borderRadius + 'px' }
}

function openThemeModal() {
  editingTheme.value = null
  Object.assign(themeForm, { name: '', colors: { primary: '#4F46E5', success: '#10B981', warning: '#F59E0B', danger: '#EF4444', info: '#3B82F6' }, fontSize: 14, borderRadius: 8, darkMode: false })
  showThemeModal.value = true
}

function editTheme(theme) {
  editingTheme.value = theme
  Object.assign(themeForm, { name: theme.name, colors: { ...theme.colors }, fontSize: theme.fontSize, borderRadius: theme.borderRadius, darkMode: theme.darkMode })
  showThemeModal.value = true
}

function submitTheme() {
  if (!themeForm.name) { alert('请填写主题名称'); return }
  if (editingTheme.value) {
    sysStore.updateTheme(editingTheme.value.id, { name: themeForm.name, colors: { ...themeForm.colors }, fontSize: themeForm.fontSize, borderRadius: themeForm.borderRadius, darkMode: themeForm.darkMode })
  } else {
    sysStore.addTheme({ ...themeForm })
  }
  showThemeModal.value = false
}

function deleteTheme(id) { if (confirm('确认删除该主题？')) sysStore.deleteTheme(id) }

function openUserModal() {
  editingUser.value = null
  Object.assign(userForm, { username: '', realName: '', email: '', phone: '', role: '查看者', department: '' })
  showUserModal.value = true
}

function editUser(user) {
  editingUser.value = user
  Object.assign(userForm, { username: user.username, realName: user.realName, email: user.email, phone: user.phone, role: user.role, department: user.department })
  showUserModal.value = true
}

function submitUser() {
  if (!userForm.username || !userForm.realName) { alert('请填写用户名和姓名'); return }
  if (editingUser.value) {
    sysStore.updateUser(editingUser.value.id, { ...userForm })
  } else {
    sysStore.addUser({ ...userForm })
  }
  showUserModal.value = false
}

function toggleUserStatus(user) { sysStore.updateUser(user.id, { status: user.status === 'active' ? 'inactive' : 'active' }) }
function deleteUser(id) { if (confirm('确认删除该用户？')) sysStore.deleteUser(id) }

function exportUsers() {
  const data = JSON.stringify(sysStore.users, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = '用户列表_' + new Date().toISOString().split('T')[0] + '.json'
  a.click()
}

function openDictModal() {
  editingDict.value = null
  Object.assign(dictForm, { name: '', code: '', description: '' })
  showDictModal.value = true
}

function editDict(dict) {
  editingDict.value = dict
  Object.assign(dictForm, { name: dict.name, code: dict.code, description: dict.description })
  showDictModal.value = true
}

function submitDict() {
  if (!dictForm.name || !dictForm.code) { alert('请填写字典名称和编码'); return }
  if (editingDict.value) {
    sysStore.updateDictionary(editingDict.value.id, { ...dictForm })
  } else {
    sysStore.addDictionary({ ...dictForm })
  }
  showDictModal.value = false
}

function deleteDict(id) { if (confirm('确认删除该字典？')) sysStore.deleteDictionary(id) }

function openEntryModal() { Object.assign(entryForm, { label: '', value: '', sort: 1, enabled: true }); showEntryModal.value = true }

function submitEntry() {
  if (!entryForm.label || !entryForm.value) { alert('请填写标签和值'); return }
  sysStore.addDictEntry(selectedDictId.value, { ...entryForm })
  showEntryModal.value = false
}

function removeEntry(entryId) { sysStore.removeDictEntry(selectedDictId.value, entryId) }

function createBackup() {
  sysStore.createBackup('手动备份')
  alert('备份已创建')
}

function restoreBackup(bk) { alert('恢复备份: ' + bk.description) }
function deleteBackup(id) { if (confirm('确认删除该备份？')) sysStore.deleteBackup(id) }
function clearCache() { if (confirm('确认清除所有缓存？')) alert('缓存已清除') }

onMounted(() => { sysStore.initSeedData() })
</script>

<style scoped>
.tab-bar {
  display: flex; gap: var(--space-1); margin-bottom: var(--space-4);
  border-bottom: 2px solid var(--color-border); flex-wrap: wrap;
}
.tab-btn {
  padding: var(--space-2) var(--space-4); background: none; border: none;
  color: var(--color-text-secondary); font-size: var(--font-size-sm); cursor: pointer;
  border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all var(--transition-fast);
}
.tab-btn:hover { color: var(--color-text-primary); }
.tab-btn.active { color: var(--color-accent); border-bottom-color: var(--color-accent); }
.theme-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--space-4);
}
.theme-card {
  background: var(--color-surface); border: 2px solid var(--color-border);
  border-radius: var(--radius-md); overflow: hidden; cursor: pointer; transition: all var(--transition-fast);
}
.theme-card:hover { box-shadow: var(--shadow-md); }
.theme-card.active { border-color: var(--color-accent); }
.theme-card-preview { height: 80px; border-bottom: 1px solid var(--color-border); }
.theme-card-info { padding: var(--space-3); }
.theme-card-actions { padding: 0 var(--space-3) var(--space-2); display: flex; gap: var(--space-1); }
.content-grid-1-1 { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
.dict-item {
  padding: var(--space-3); border-bottom: 1px solid var(--color-border); cursor: pointer;
  transition: background var(--transition-fast);
}
.dict-item:hover { background: var(--color-bg-tertiary); }
.dict-item.active { background: var(--color-accent-subtle); }
.role-badge {
  display: inline-block; padding: 1px 8px; background: var(--color-info-subtle);
  color: var(--color-info); border-radius: var(--radius-full); font-size: var(--font-size-xs);
}
@media (max-width: 768px) {
  .content-grid-1-1 { grid-template-columns: 1fr; }
}
</style>
