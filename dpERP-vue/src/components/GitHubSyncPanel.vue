<template>
  <div class="github-sync-panel">
    <div class="panel-header">
      <h3>GitHub 云端备份</h3>
      <span class="panel-desc">将数据自动备份到 GitHub Gist，支持多设备同步</span>
    </div>

    <!-- 未认证状态 -->
    <div v-if="!authStatus.isAuthenticated" class="auth-section">
      <div class="auth-methods">
        <!-- Personal Access Token 方式 -->
        <div class="auth-method">
          <h4>方式一：Personal Access Token</h4>
          <p class="method-desc">在 GitHub Settings <Icon name="chevronRight" :size="14" /> Developer settings <Icon name="chevronRight" :size="14" /> Personal access tokens 创建，需要勾选 <code>gist</code> 权限</p>
          <div class="input-group">
            <input
              v-model="patInput"
              type="password"
              class="form-input"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              @keydown.enter="handlePATAuth"
            />
            <button class="btn btn-primary" @click="handlePATAuth" :disabled="!patInput || authLoading">
              {{ authLoading ? '验证中...' : '连接' }}
            </button>
          </div>
        </div>

        <!-- OAuth 设备流方式 -->
        <div class="auth-method">
          <h4>方式二：OAuth 设备流</h4>
          <p class="method-desc">需要先创建 GitHub OAuth App，填入 Client ID</p>
          <div class="input-group">
            <input
              v-model="clientIdInput"
              type="text"
              class="form-input"
              placeholder="GitHub OAuth App Client ID"
            />
            <button class="btn btn-outline" @click="handleOAuthStart" :disabled="!clientIdInput || authLoading">
              获取验证码
            </button>
          </div>

          <!-- 设备码显示 -->
          <div v-if="deviceCodeInfo" class="device-code-section">
            <p>请在浏览器中打开：<a :href="deviceCodeInfo.verificationUri" target="_blank">{{ deviceCodeInfo.verificationUri }}</a></p>
            <div class="device-code-display">
              <span class="code-label">输入验证码：</span>
              <span class="code-value">{{ deviceCodeInfo.userCode }}</span>
              <button class="btn btn-ghost btn-sm" @click="copyDeviceCode">复制</button>
            </div>
            <p class="code-hint">验证后点击下方按钮完成连接</p>
            <button class="btn btn-primary" @click="handleOAuthConfirm" :disabled="authLoading">
              {{ authLoading ? '等待验证...' : '已完成验证' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 已认证状态 -->
    <div v-else class="sync-section">
      <!-- 用户信息 -->
      <div class="user-info">
        <img v-if="authStatus.user?.avatar" :src="authStatus.user.avatar" class="user-avatar" />
        <div v-else class="user-avatar-placeholder">{{ authStatus.user?.login?.charAt(0) || '?' }}</div>
        <div class="user-details">
          <span class="user-name">{{ authStatus.user?.name || authStatus.user?.login }}</span>
          <span class="user-login">@{{ authStatus.user?.login }}</span>
        </div>
        <button class="btn btn-ghost btn-sm" @click="handleLogout">断开</button>
      </div>

      <!-- Gist 信息 -->
      <div v-if="authStatus.gistId" class="gist-info">
        <span class="gist-label">备份 Gist：</span>
        <a :href="`https://gist.github.com/${authStatus.gistId}`" target="_blank" class="gist-link">
          {{ authStatus.gistId.slice(0, 8) }}...
        </a>
      </div>

      <!-- 同步配置 -->
      <div class="sync-config">
        <div class="config-item">
          <label class="config-label">
            <input type="checkbox" v-model="config.autoUpload" @change="handleConfigChange" />
            自动上传到 GitHub
          </label>
          <span class="config-hint">开启后定期自动备份数据到 GitHub Gist</span>
        </div>

        <div v-if="config.autoUpload" class="config-item sub-item">
          <label class="config-label">上传间隔</label>
          <select v-model="config.autoUploadInterval" @change="handleConfigChange" class="form-select">
            <option :value="60000">1 分钟</option>
            <option :value="300000">5 分钟</option>
            <option :value="600000">10 分钟</option>
            <option :value="1800000">30 分钟</option>
            <option :value="3600000">1 小时</option>
          </select>
        </div>

        <div class="config-item">
          <label class="config-label">
            <input type="checkbox" v-model="config.uploadViewState" @change="handleConfigChange" />
            上传视图状态（筛选、排序等）
          </label>
        </div>

        <div class="config-item">
          <label class="config-label">
            <input type="checkbox" v-model="config.uploadLayoutState" @change="handleConfigChange" />
            上传布局状态（侧边栏、面板等）
          </label>
        </div>

        <div class="config-item">
          <label class="config-label">
            <input type="checkbox" v-model="config.encrypt" @change="handleConfigChange" />
            加密上传
          </label>
          <span class="config-hint">开启后数据将加密后上传，防止明文存储</span>
        </div>

        <div v-if="config.encrypt" class="config-item sub-item">
          <label class="config-label">加密密钥</label>
          <input v-model="config.encryptionKey" type="password" class="form-input"
                 placeholder="输入加密密钥" @change="handleConfigChange" />
        </div>

        <div class="config-item">
          <label class="config-label">Gist 可见性</label>
          <select v-model="config.gistPublic" @change="handleConfigChange" class="form-select">
            <option :value="false">私密（仅自己可见）</option>
            <option :value="true">公开</option>
          </select>
        </div>
      </div>

      <!-- 手动操作 -->
      <div class="sync-actions">
        <button class="btn btn-primary" @click="handleUpload" :disabled="uploading">
          {{ uploading ? '上传中...' : '立即上传备份' }}
        </button>
        <button class="btn btn-outline" @click="handleDownload" :disabled="downloading">
          {{ downloading ? '下载中...' : '从 GitHub 恢复' }}
        </button>
        <button class="btn btn-ghost" @click="handleViewHistory">
          查看历史版本
        </button>
      </div>

      <!-- 上传结果 -->
      <div v-if="uploadResult" class="upload-result success">
        上传成功！
        <a :href="uploadResult.htmlUrl" target="_blank">在 GitHub 查看</a>
      </div>
      <div v-if="errorMessage" class="upload-result error">
        {{ errorMessage }}
      </div>

      <!-- 历史版本 -->
      <div v-if="showHistory && historyList.length > 0" class="history-section">
        <h4>历史版本</h4>
        <div class="history-list">
          <div v-for="ver in historyList" :key="ver.version" class="history-item" @click="handleRestoreVersion(ver)">
            <span class="history-time">{{ formatDate(ver.committedAt) }}</span>
            <span class="history-user">{{ ver.user }}</span>
            <button class="btn btn-ghost btn-sm">恢复</button>
          </div>
        </div>
      </div>

      <!-- 统计 -->
      <div class="sync-stats">
        <span>总上传: {{ stats.totalUploads }} 次</span>
        <span>总下载: {{ stats.totalDownloads }} 次</span>
        <span v-if="stats.lastUploadTime">上次上传: {{ formatTime(stats.lastUploadTime) }}</span>
        <span :class="{ 'active': stats.autoUploadEnabled }">
          {{ stats.autoUploadEnabled ? '自动上传已开启' : '自动上传已关闭' }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import githubSync from '@/utils/githubSync'
import autoSave from '@/utils/autoSave'

const patInput = ref('')
const clientIdInput = ref('')
const authLoading = ref(false)
const uploading = ref(false)
const downloading = ref(false)
const deviceCodeInfo = ref(null)
const uploadResult = ref(null)
const errorMessage = ref('')
const showHistory = ref(false)
const historyList = ref([])

const authStatus = computed(() => githubSync.getAuthStatus())
const stats = computed(() => githubSync.getStats())
const config = reactive(githubSync.getConfig())

/* PAT 认证 */
async function handlePATAuth() {
  if (!patInput.value) return
  authLoading.value = true
  errorMessage.value = ''
  try {
    await githubSync.authWithToken(patInput.value.trim())
    patInput.value = ''
  } catch (e) {
    errorMessage.value = e.message
  } finally {
    authLoading.value = false
  }
}

/* OAuth 设备流 */
async function handleOAuthStart() {
  if (!clientIdInput.value) return
  authLoading.value = true
  errorMessage.value = ''
  try {
    deviceCodeInfo.value = await githubSync.startAuth(clientIdInput.value.trim())
  } catch (e) {
    errorMessage.value = e.message
  } finally {
    authLoading.value = false
  }
}

async function handleOAuthConfirm() {
  if (!deviceCodeInfo.value) return
  authLoading.value = true
  errorMessage.value = ''
  try {
    await githubSync.pollForToken(
      deviceCodeInfo.value.deviceCode,
      clientIdInput.value.trim(),
      deviceCodeInfo.value.interval
    )
    deviceCodeInfo.value = null
  } catch (e) {
    errorMessage.value = e.message
  } finally {
    authLoading.value = false
  }
}

function copyDeviceCode() {
  if (deviceCodeInfo.value?.userCode) {
    navigator.clipboard.writeText(deviceCodeInfo.value.userCode)
  }
}

/* 登出 */
function handleLogout() {
  githubSync.logout()
}

/* 配置变更 */
function handleConfigChange() {
  githubSync.updateConfig({ ...config })
}

/* 手动上传 */
async function handleUpload() {
  uploading.value = true
  uploadResult.value = null
  errorMessage.value = ''
  try {
    const result = await autoSave.uploadToGitHub()
    if (result) {
      uploadResult.value = result
    }
  } catch (e) {
    errorMessage.value = '上传失败: ' + e.message
  } finally {
    uploading.value = false
  }
}

/* 手动下载 */
async function handleDownload() {
  downloading.value = true
  errorMessage.value = ''
  try {
    const data = await autoSave.downloadFromGitHub()
    if (data) {
      /* 恢复数据到各Store */
      for (const [moduleName, moduleData] of Object.entries(data.modules || {})) {
        if (Array.isArray(moduleData) && moduleData.length > 0) {
          const store = githubSync._stores[moduleName]
          if (store) {
            const dataKey = githubSync._getDataKey(moduleName)
            if (store[dataKey]) {
              store[dataKey] = moduleData
            }
          }
        }
      }
      /* 恢复视图和布局状态 */
      if (data.viewState) {
        localStorage.setItem('gj_erp_viewState', JSON.stringify(data.viewState))
      }
      if (data.layoutState) {
        localStorage.setItem('gj_erp_layoutState', JSON.stringify(data.layoutState))
      }
      uploadResult.value = { htmlUrl: data.htmlUrl }
    }
  } catch (e) {
    errorMessage.value = '下载失败: ' + e.message
  } finally {
    downloading.value = false
  }
}

/* 查看历史 */
async function handleViewHistory() {
  showHistory.value = !showHistory.value
  if (showHistory.value) {
    historyList.value = await githubSync.getHistory()
  }
}

/* 恢复版本 */
async function handleRestoreVersion(ver) {
  downloading.value = true
  errorMessage.value = ''
  try {
    const data = await autoSave.downloadFromGitHub(null, ver.version)
    if (data) {
      for (const [moduleName, moduleData] of Object.entries(data.modules || {})) {
        if (Array.isArray(moduleData)) {
          const store = githubSync._stores[moduleName]
          if (store) {
            const dataKey = githubSync._getDataKey(moduleName)
            if (store[dataKey]) {
              store[dataKey] = moduleData
            }
          }
        }
      }
      uploadResult.value = { htmlUrl: data.htmlUrl }
    }
  } catch (e) {
    errorMessage.value = '恢复失败: ' + e.message
  } finally {
    downloading.value = false
  }
}

/* 格式化日期 */
function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatTime(ts) {
  if (!ts) return ''
  return formatDate(new Date(ts).toISOString())
}

onMounted(() => {
  githubSync.init()
})
</script>

<style scoped>
.github-sync-panel {
  max-width: 600px;
  padding: var(--space-5);
}

.panel-header {
  margin-bottom: var(--space-5);
}
.panel-header h3 {
  margin: 0 0 var(--space-1);
  font-size: var(--font-size-lg);
}
.panel-desc {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
  margin: 0;
}

.auth-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
.auth-method {
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
.auth-method h4 {
  margin: 0 0 var(--space-2);
  font-size: var(--font-size-sm);
}
.method-desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin: 0 0 var(--space-3);
}
.method-desc code {
  background: var(--color-bg-tertiary);
  padding: 1px 4px;
  border-radius: 2px;
  font-size: var(--font-size-xs);
}
.input-group {
  display: flex;
  gap: var(--space-2);
}
.input-group .form-input {
  flex: 1;
}
.device-code-section {
  margin-top: var(--space-3);
  padding: var(--space-3);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
}
.device-code-section p {
  font-size: var(--font-size-xs);
  margin: 0 0 var(--space-2);
}
.device-code-section a {
  color: var(--color-accent);
}
.device-code-display {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}
.code-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}
.code-value {
  font-family: monospace;
  font-size: var(--font-size-lg);
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--color-accent);
  user-select: all;
}
.code-hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.sync-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.user-info {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
}
.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
}
.user-avatar-placeholder {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  background: var(--color-accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}
.user-details {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.user-name { font-weight: 600; font-size: var(--font-size-sm); }
.user-login { font-size: var(--font-size-xs); color: var(--color-text-tertiary); }

.gist-info {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}
.gist-link {
  color: var(--color-accent);
  font-family: monospace;
}

.sync-config {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.config-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.config-item.sub-item {
  padding-left: var(--space-6);
}
.config-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
  cursor: pointer;
}
.config-hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.sync-actions {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.upload-result {
  padding: var(--space-3);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
}
.upload-result.success {
  background: var(--color-success-subtle, #dcfce7);
  color: var(--color-success, #16a34a);
}
.upload-result.error {
  background: var(--color-danger-subtle, #fef2f2);
  color: var(--color-danger, #dc2626);
}
.upload-result a {
  color: inherit;
  text-decoration: underline;
}

.history-section h4 {
  margin: 0 0 var(--space-2);
  font-size: var(--font-size-sm);
}
.history-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.history-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--font-size-xs);
}
.history-item:hover {
  background: var(--color-bg-secondary);
}
.history-time { flex: 1; }
.history-user { color: var(--color-text-tertiary); }

.sync-stats {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
}
.sync-stats .active {
  color: var(--color-success);
  font-weight: 600;
}

/* 通用样式 */
.btn {
  padding: 6px 14px;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
}
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary { background: var(--color-accent); color: #fff; border-color: var(--color-accent); }
.btn-outline { background: transparent; border-color: var(--color-border); color: var(--color-text-secondary); }
.btn-ghost { background: transparent; border: none; color: var(--color-text-tertiary); }
.btn-ghost:hover { color: var(--color-text-primary); background: var(--color-bg-secondary); }
.btn-sm { padding: 3px 8px; font-size: var(--font-size-xs); }
.form-input, .form-select {
  padding: 6px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  outline: none;
}
.form-input:focus, .form-select:focus { border-color: var(--color-accent); }
</style>
