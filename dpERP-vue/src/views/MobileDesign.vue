<template>
  <div class="mobiledesign-page">
    <div class="page-header">
      <div>
        <h2 class="page-header-title">移动端设计</h2>
        <p class="page-header-subtitle">移动应用启动页与UI设计方案展示 · 5套完整方案</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-primary" @click="openPageModal">➕ 新建页面</button>
        <button class="btn btn-ghost" @click="previewAll">👁️ 预览全部</button>
      </div>
    </div>

    <div class="filter-bar" style="margin-bottom:var(--space-4);flex-wrap:wrap;gap:var(--space-2)">
      <div style="display:flex;gap:var(--space-2);flex-wrap:wrap;align-items:center">
        <button v-for="p in proposals" :key="p.id" class="btn" :class="activeProposal === p.id ? 'btn-primary' : 'btn-secondary'" @click="activeProposal = p.id">{{ p.label }}</button>
      </div>
      <div style="display:flex;gap:var(--space-2);align-items:center;margin-left:auto">
        <div style="display:flex;gap:4px;background:var(--color-bg-tertiary);border-radius:var(--radius-md);padding:2px">
          <button v-for="d in devices" :key="d.key" class="btn btn-ghost btn-sm" :class="{ 'active-device': activeDevice === d.key }" style="padding:4px 8px;font-size:12px" @click="activeDevice = d.key" :title="d.title">{{ d.label }}</button>
        </div>
        <div style="display:flex;align-items:center;gap:6px;background:var(--color-bg-tertiary);border-radius:var(--radius-md);padding:4px 10px">
          <span style="font-size:12px;color:var(--color-text-secondary)">设计稿</span>
          <label style="position:relative;display:inline-block;width:36px;height:20px;cursor:pointer">
            <input type="checkbox" v-model="realtimePreview" style="opacity:0;width:0;height:0">
            <span style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:var(--color-border);border-radius:20px;transition:0.3s"></span>
            <span style="position:absolute;height:16px;width:16px;left:2px;bottom:2px;background:#fff;border-radius:50%;transition:0.3s" :style="{ left: realtimePreview ? '18px' : '2px' }"></span>
          </label>
          <span style="font-size:12px;color:var(--color-text-secondary)">实时预览</span>
        </div>
        <button class="btn btn-secondary btn-sm" @click="exportDesignSpec" title="导出设计规格">📥 导出设计规格</button>
      </div>
    </div>

    <div class="tab-bar">
      <button v-for="tab in tabs" :key="tab.key" class="tab-btn" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">{{ tab.label }}</button>
    </div>

    <div v-if="activeTab === 'pages'">
      <div class="stats-row" style="margin-bottom:var(--space-4)">
        <div class="stat-card"><div class="stat-card-icon" style="background:var(--color-accent-subtle);color:var(--color-accent)">📱</div><div class="stat-card-value">{{ mdStore.pageCount }}</div><div class="stat-card-label">页面总数</div></div>
        <div class="stat-card"><div class="stat-card-icon" style="background:var(--color-success-subtle);color:var(--color-success)">✅</div><div class="stat-card-value">{{ mdStore.publishedCount }}</div><div class="stat-card-label">已发布</div></div>
        <div class="stat-card"><div class="stat-card-icon" style="background:var(--color-warning-subtle);color:var(--color-warning)">📝</div><div class="stat-card-value">{{ mdStore.draftCount }}</div><div class="stat-card-label">草稿</div></div>
        <div class="stat-card"><div class="stat-card-icon" style="background:var(--color-info-subtle);color:var(--color-info)">🧭</div><div class="stat-card-value">{{ mdStore.navCount }}</div><div class="stat-card-label">导航项</div></div>
      </div>
      <div class="page-grid">
        <div v-if="mdStore.pages.length === 0" style="grid-column:1/-1;text-align:center;padding:var(--space-8);color:var(--color-text-tertiary)">暂无页面，点击"新建页面"开始设计</div>
        <div v-for="page in mdStore.pages" :key="page.id" class="page-card">
          <div class="page-card-header">
            <span class="page-card-type">{{ mdStore.pageTypeLabels[page.type] || page.type }}</span>
            <span class="status-badge" :class="page.status === 'published' ? 'success' : 'warning'">{{ page.status === 'published' ? '已发布' : '草稿' }}</span>
          </div>
          <div class="page-card-body">
            <div class="page-card-title">{{ page.name }}</div>
            <div class="page-card-meta">布局: {{ page.layout === 'single' ? '单列' : page.layout === 'grid' ? '网格' : '自由' }} · 组件: {{ page.components.length }}个</div>
            <div class="page-card-components">
              <span v-for="comp in page.components.slice(0, 3)" :key="comp" class="comp-badge">{{ comp }}</span>
              <span v-if="page.components.length > 3" class="comp-badge comp-badge-more">+{{ page.components.length - 3 }}</span>
            </div>
          </div>
          <div class="page-card-footer">
            <span style="font-size:var(--font-size-xs);color:var(--color-text-tertiary)">更新: {{ page.updatedAt }}</span>
            <div style="display:flex;gap:var(--space-1)">
              <button class="btn btn-ghost btn-sm" @click="editPage(page)">编辑</button>
              <button v-if="page.status === 'draft'" class="btn btn-ghost btn-sm" style="color:var(--color-success)" @click="publishPage(page.id)">发布</button>
              <button v-else class="btn btn-ghost btn-sm" style="color:var(--color-warning)" @click="unpublishPage(page.id)">下线</button>
              <button class="btn btn-ghost btn-sm" style="color:var(--color-danger)" @click="deletePage(page.id)">删除</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'nav'">
      <div class="content-grid content-grid-2-1">
        <div class="panel-card">
          <div class="panel-card-header"><span class="panel-card-title">导航栏配置</span></div>
          <div class="panel-card-body">
            <div class="nav-list">
              <div v-if="sortedNavItems.length === 0" style="color:var(--color-text-tertiary);font-size:var(--font-size-sm)">暂无导航项</div>
              <div v-for="(item, idx) in sortedNavItems" :key="item.id" class="nav-item-row">
                <span class="nav-item-order">{{ idx + 1 }}</span>
                <span class="nav-item-icon">{{ item.icon }}</span>
                <span class="nav-item-label">{{ item.label }}</span>
                <span class="nav-item-page">{{ getPageName(item.pageId) }}</span>
                <span class="status-badge" :class="item.visible ? 'success' : 'neutral'">{{ item.visible ? '显示' : '隐藏' }}</span>
                <div class="nav-item-actions">
                  <button v-if="idx > 0" class="btn btn-ghost btn-sm" @click="moveNavUp(idx)">↑</button>
                  <button v-if="idx < sortedNavItems.length - 1" class="btn btn-ghost btn-sm" @click="moveNavDown(idx)">↓</button>
                  <button class="btn btn-ghost btn-sm" @click="toggleNavVisible(item)">{{ item.visible ? '隐藏' : '显示' }}</button>
                  <button class="btn btn-ghost btn-sm" style="color:var(--color-danger)" @click="deleteNavItem(item.id)">删除</button>
                </div>
              </div>
            </div>
            <div style="margin-top:var(--space-4);display:flex;gap:var(--space-2);align-items:center;flex-wrap:wrap">
              <input type="text" class="form-input" v-model="navForm.label" placeholder="导航名称" style="width:120px">
              <input type="text" class="form-input" v-model="navForm.icon" placeholder="图标(emoji)" style="width:80px">
              <select class="form-select" v-model="navForm.pageId" style="width:auto">
                <option value="">选择页面</option>
                <option v-for="p in mdStore.pages" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
              <button class="btn btn-primary btn-sm" @click="addNavItem">➕ 添加</button>
            </div>
          </div>
        </div>
        <div>
          <div class="phone-preview">
            <div class="phone-frame">
              <div class="phone-status-bar"><span>9:41</span><span>📶 🔋</span></div>
              <div class="phone-content">
                <div style="padding:var(--space-3);font-size:var(--font-size-sm);color:var(--color-text-tertiary);text-align:center">页面预览区域</div>
              </div>
              <div class="phone-nav-bar">
                <div v-for="item in visibleNavItems" :key="item.id" class="phone-nav-item">
                  <span class="phone-nav-icon">{{ item.icon }}</span>
                  <span class="phone-nav-label">{{ item.label }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'theme'">
      <div class="content-grid content-grid-2-1">
        <div class="panel-card">
          <div class="panel-card-header"><span class="panel-card-title">🎨 主题定制</span></div>
          <div class="panel-card-body">
            <div class="form-group">
              <label class="form-label">主色调</label>
              <div style="display:flex;gap:var(--space-2);align-items:center">
                <input type="color" v-model="editTheme.primaryColor" style="width:40px;height:32px;border:none;cursor:pointer">
                <input type="text" class="form-input" v-model="editTheme.primaryColor" style="width:100px">
              </div>
            </div>
            <div class="form-row form-row-2">
              <div class="form-group">
                <label class="form-label">字体大小 (px)</label>
                <input type="number" class="form-input" v-model.number="editTheme.fontSize" min="12" max="20">
              </div>
              <div class="form-group">
                <label class="form-label">圆角 (px)</label>
                <input type="number" class="form-input" v-model.number="editTheme.borderRadius" min="0" max="24">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">字体</label>
              <select class="form-select" v-model="editTheme.fontFamily">
                <option value="system">系统默认</option>
                <option value="sans">Sans-serif</option>
                <option value="serif">Serif</option>
                <option value="mono">Monospace</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label"><input type="checkbox" v-model="editTheme.darkMode"> 深色模式</label>
            </div>
            <div class="form-group">
              <label class="form-label"><input type="checkbox" v-model="editTheme.compactMode"> 紧凑模式</label>
            </div>
            <div style="display:flex;gap:var(--space-2);margin-top:var(--space-4)">
              <button class="btn btn-primary" @click="saveTheme">💾 保存主题</button>
              <button class="btn btn-ghost" @click="resetTheme">🔄 重置</button>
            </div>
          </div>
        </div>
        <div>
          <div class="phone-preview">
            <div class="phone-frame" :style="phoneFrameStyle">
              <div class="phone-status-bar"><span>9:41</span><span>📶 🔋</span></div>
              <div class="phone-content" :style="phoneContentStyle">
                <div style="padding:var(--space-3);text-align:center">
                  <div :style="{ background: editTheme.primaryColor, color: '#fff', padding: '8px', borderRadius: editTheme.borderRadius + 'px', marginBottom: '8px', fontSize: editTheme.fontSize + 'px' }">主题预览</div>
                  <div :style="{ border: '2px solid ' + editTheme.primaryColor, borderRadius: editTheme.borderRadius + 'px', padding: '8px', fontSize: (editTheme.fontSize - 2) + 'px' }">边框样式</div>
                </div>
              </div>
              <div class="phone-nav-bar" :style="{ background: editTheme.darkMode ? '#1a1a2e' : '#fff' }">
                <div v-for="item in visibleNavItems.slice(0, 5)" :key="item.id" class="phone-nav-item">
                  <span class="phone-nav-icon">{{ item.icon }}</span>
                  <span class="phone-nav-label" :style="{ color: editTheme.primaryColor }">{{ item.label }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showPageModal" class="modal-overlay" @click.self="showPageModal = false">
      <div class="modal-dialog" @click.stop>
        <div class="modal-header"><span class="modal-title">{{ editingPage ? '编辑页面' : '新建页面' }}</span><button class="modal-close" @click="showPageModal = false">✕</button></div>
        <div class="modal-body">
          <div class="form-group"><label class="form-label">页面名称 <span class="required">*</span></label><input type="text" class="form-input" v-model="pageForm.name" placeholder="页面名称"></div>
          <div class="form-row form-row-2">
            <div class="form-group"><label class="form-label">页面类型</label><select class="form-select" v-model="pageForm.type"><option v-for="(label, key) in mdStore.pageTypeLabels" :key="key" :value="key">{{ label }}</option></select></div>
            <div class="form-group"><label class="form-label">布局方式</label><select class="form-select" v-model="pageForm.layout"><option value="single">单列</option><option value="grid">网格</option><option value="free">自由布局</option></select></div>
          </div>
          <div class="form-group"><label class="form-label">组件（逗号分隔）</label><input type="text" class="form-input" v-model="pageForm.componentsStr" placeholder="组件1,组件2,组件3"></div>
        </div>
        <div class="modal-footer"><button class="btn btn-secondary" @click="showPageModal = false">取消</button><button class="btn btn-primary" @click="submitPage">保存</button></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useMobileDesignStore } from '@/stores/mobileDesign'

const mdStore = useMobileDesignStore()

const tabs = [
  { key: 'pages', label: '📱 页面管理' },
  { key: 'nav', label: '🧭 导航配置' },
  { key: 'theme', label: '🎨 主题定制' }
]

const activeTab = ref('pages')
const showPageModal = ref(false)
const editingPage = ref(null)
const activeProposal = ref(1)
const activeDevice = ref('iphone')
const realtimePreview = ref(false)

const proposals = [
  { id: 1, label: '方案一 · 极简商务' },
  { id: 2, label: '方案二 · 科技活力' },
  { id: 3, label: '方案三 · 温暖企业' },
  { id: 4, label: '方案四 · 暗色高端' },
  { id: 5, label: '方案五 · 清新自然' }
]

const devices = [
  { key: 'iphone', label: '📱 iPhone', title: 'iPhone 375x812' },
  { key: 'android', label: '📱 Android', title: 'Android 360x800' },
  { key: 'ipad', label: '📱 iPad', title: 'iPad 768x1024' }
]

const pageForm = reactive({ name: '', type: 'custom', layout: 'single', componentsStr: '' })
const navForm = reactive({ label: '', icon: '📄', pageId: '' })
const editTheme = reactive({ ...mdStore.theme })

const sortedNavItems = computed(() => [...mdStore.navItems].sort((a, b) => a.order - b.order))
const visibleNavItems = computed(() => sortedNavItems.value.filter(n => n.visible))

const phoneFrameStyle = computed(() => ({
  background: editTheme.darkMode ? '#0f0f1a' : '#f5f5f5'
}))

const phoneContentStyle = computed(() => ({
  background: editTheme.darkMode ? '#1a1a2e' : '#fff',
  color: editTheme.darkMode ? '#e0e0e0' : '#333',
  fontFamily: editTheme.fontFamily === 'system' ? 'system-ui' : editTheme.fontFamily,
  fontSize: editTheme.fontSize + 'px'
}))

function getPageName(pageId) {
  const page = mdStore.pages.find(p => p.id === pageId)
  return page ? page.name : '-'
}

function openPageModal() {
  editingPage.value = null
  Object.assign(pageForm, { name: '', type: 'custom', layout: 'single', componentsStr: '' })
  showPageModal.value = true
}

function editPage(page) {
  editingPage.value = page
  Object.assign(pageForm, { name: page.name, type: page.type, layout: page.layout, componentsStr: page.components.join(',') })
  showPageModal.value = true
}

function submitPage() {
  if (!pageForm.name) { alert('请填写页面名称'); return }
  const data = { name: pageForm.name, type: pageForm.type, layout: pageForm.layout, components: pageForm.componentsStr ? pageForm.componentsStr.split(',').map(s => s.trim()).filter(Boolean) : [] }
  if (editingPage.value) {
    mdStore.updatePage(editingPage.value.id, data)
  } else {
    mdStore.addPage(data)
  }
  showPageModal.value = false
}

function publishPage(id) { mdStore.publishPage(id) }
function unpublishPage(id) { mdStore.unpublishPage(id) }
function deletePage(id) { if (confirm('确认删除该页面？')) mdStore.deletePage(id) }

function addNavItem() {
  if (!navForm.label) { alert('请填写导航名称'); return }
  mdStore.addNavItem({ label: navForm.label, icon: navForm.icon, pageId: navForm.pageId })
  Object.assign(navForm, { label: '', icon: '📄', pageId: '' })
}

function deleteNavItem(id) { mdStore.deleteNavItem(id) }

function toggleNavVisible(item) { mdStore.updateNavItem(item.id, { visible: !item.visible }) }

function moveNavUp(idx) {
  const items = sortedNavItems.value
  if (idx <= 0) return
  const newOrder = items.map(i => i.id)
  ;[newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]]
  mdStore.reorderNav(newOrder)
}

function moveNavDown(idx) {
  const items = sortedNavItems.value
  if (idx >= items.length - 1) return
  const newOrder = items.map(i => i.id)
  ;[newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]]
  mdStore.reorderNav(newOrder)
}

function saveTheme() {
  mdStore.saveTheme({ ...editTheme })
  alert('主题已保存')
}

function resetTheme() {
  mdStore.resetTheme()
  Object.assign(editTheme, mdStore.theme)
}

function previewAll() { alert('预览功能：将打开移动端预览窗口') }

function exportDesignSpec() {
  const spec = {
    proposal: proposals.find(p => p.id === activeProposal.value),
    device: devices.find(d => d.key === activeDevice.value),
    theme: { ...editTheme },
    pages: mdStore.pages.map(p => ({ name: p.name, type: p.type, layout: p.layout, components: p.components, status: p.status })),
    navItems: sortedNavItems.value.map(n => ({ label: n.label, icon: n.icon, pageId: n.pageId, visible: n.visible, order: n.order })),
    exportTime: new Date().toISOString()
  }
  const data = JSON.stringify(spec, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = '设计规格_' + proposals.find(p => p.id === activeProposal.value)?.label + '_' + new Date().toISOString().split('T')[0] + '.json'
  a.click()
}

onMounted(() => { mdStore.initSeedData() })
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
.active-device {
  background: var(--color-accent) !important;
  color: #fff !important;
}
.tab-btn:hover { color: var(--color-text-primary); }
.tab-btn.active { color: var(--color-accent); border-bottom-color: var(--color-accent); }
.page-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--space-4);
}
.page-card {
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: var(--radius-md); overflow: hidden; transition: box-shadow var(--transition-fast);
}
.page-card:hover { box-shadow: var(--shadow-md); }
.page-card-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: var(--space-3); border-bottom: 1px solid var(--color-border);
}
.page-card-type { font-size: var(--font-size-xs); color: var(--color-text-tertiary); }
.page-card-body { padding: var(--space-3); }
.page-card-title { font-weight: 600; margin-bottom: var(--space-1); }
.page-card-meta { font-size: var(--font-size-xs); color: var(--color-text-tertiary); margin-bottom: var(--space-2); }
.page-card-components { display: flex; flex-wrap: wrap; gap: 4px; }
.comp-badge {
  display: inline-block; padding: 1px 6px; background: var(--color-accent-subtle);
  color: var(--color-accent); border-radius: var(--radius-sm); font-size: 10px;
}
.comp-badge-more { background: var(--color-bg-tertiary); color: var(--color-text-tertiary); }
.page-card-footer {
  display: flex; justify-content: space-between; align-items: center;
  padding: var(--space-2) var(--space-3); border-top: 1px solid var(--color-border);
}
.content-grid-2-1 { display: grid; grid-template-columns: 2fr 1fr; gap: var(--space-4); }
.nav-list { display: flex; flex-direction: column; gap: var(--space-2); }
.nav-item-row {
  display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3);
  background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-sm);
}
.nav-item-order { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; background: var(--color-bg-tertiary); border-radius: var(--radius-sm); font-size: var(--font-size-xs); }
.nav-item-icon { font-size: 18px; }
.nav-item-label { font-weight: 600; font-size: var(--font-size-sm); flex: 1; }
.nav-item-page { font-size: var(--font-size-xs); color: var(--color-text-tertiary); }
.nav-item-actions { display: flex; gap: 2px; }
.phone-preview { display: flex; justify-content: center; padding: var(--space-4); }
.phone-frame {
  width: 280px; height: 500px; border: 2px solid var(--color-border); border-radius: 24px;
  overflow: hidden; display: flex; flex-direction: column; background: #f5f5f5;
}
.phone-status-bar {
  display: flex; justify-content: space-between; padding: 4px 12px;
  font-size: 11px; color: var(--color-text-tertiary); background: var(--color-surface);
}
.phone-content { flex: 1; overflow-y: auto; }
.phone-nav-bar {
  display: flex; justify-content: space-around; padding: 6px 0;
  border-top: 1px solid var(--color-border); background: #fff;
}
.phone-nav-item { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.phone-nav-icon { font-size: 16px; }
.phone-nav-label { font-size: 9px; }
@media (max-width: 768px) {
  .content-grid-2-1 { grid-template-columns: 1fr; }
}
</style>
