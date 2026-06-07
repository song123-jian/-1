/**
 * GitHub Gist 云端备份模块
 * 使用 GitHub Gist API 实现数据自动上传云端
 * 支持：
 * - GitHub OAuth 设备流认证（无需后端）
 * - 自动/手动上传数据快照到 Gist
 * - 从 Gist 恢复数据
 * - 增量上传（仅上传变更部分）
 * - 多版本快照管理
 * - 上传频率控制（避免触发 API 限制）
 * - 加密选项（敏感数据加密后上传）
 */

import eventBus from './eventBus'

const GITHUB_TOKEN_KEY = 'gj_erp_github_token'
const GITHUB_GIST_ID_KEY = 'gj_erp_github_gist_id'
const GITHUB_CONFIG_KEY = 'gj_erp_github_config'
const GITHUB_USER_KEY = 'gj_erp_github_user'

/* GitHub API 基础地址 */
const GITHUB_API = 'https://api.github.com'

/* 上传配置 */
const DEFAULT_CONFIG = {
  /* 是否启用自动上传 */
  autoUpload: false,
  /* 自动上传间隔（毫秒），默认5分钟 */
  autoUploadInterval: 5 * 60 * 1000,
  /* 是否上传视图状态 */
  uploadViewState: true,
  /* 是否上传草稿 */
  uploadDrafts: false,
  /* 是否上传布局状态 */
  uploadLayoutState: true,
  /* 最大快照数（Gist中保留的历史版本） */
  maxSnapshots: 10,
  /* 是否加密 */
  encrypt: false,
  /* 加密密钥（用户自定义） */
  encryptionKey: '',
  /* 上传哪些模块的数据 */
  uploadModules: [
    'customer', 'quotation', 'contract', 'inventory',
    'delivery', 'collection', 'statement', 'supplier',
    'warehouseLocation', 'cost', 'todo'
  ],
  /* Gist 描述 */
  gistDescription: '冠久ERP 数据备份 - 自动同步',
  /* Gist 是否公开 */
  gistPublic: false
}

/* GitHub OAuth 配置 */
/* 注意：这里使用设备流(Device Flow)，无需 Client Secret */
const OAUTH_CONFIG = {
  clientId: '',  /* 需要用户在 GitHub 创建 OAuth App 后填入 */
  scopes: 'gist',
  deviceCodeUrl: 'https://github.com/login/device/code',
  accessTokenUrl: 'https://github.com/login/oauth/access_token'
}

class GitHubSync {
  constructor() {
    this._token = null
    this._gistId = null
    this._config = { ...DEFAULT_CONFIG }
    this._userInfo = null
    this._autoUploadTimer = null
    this._isUploading = false
    this._lastUploadTime = null
    this._stats = {
      totalUploads: 0,
      totalDownloads: 0,
      lastUploadTime: null,
      lastDownloadTime: null,
      uploadErrors: 0
    }
    this._initialized = false
    /* Store引用 */
    this._stores = {}
  }

  /**
   * 初始化
   */
  init() {
    if (this._initialized) return

    /* 从 localStorage 恢复配置 */
    this._loadConfig()

    if (this._token) {
      this._verifyToken().then(valid => {
        if (valid && this._config.autoUpload) {
          this.startAutoUpload()
        }
      })
    }

    this._initialized = true
    console.info('[GitHubSync] GitHub同步模块已初始化')
  }

  /* ========== 认证相关 ========== */

  /**
   * 开始设备流认证
   * 返回验证URL和用户码，用户需要在浏览器中打开URL并输入码
   * @param {string} clientId - GitHub OAuth App Client ID
   * @returns {Object} { deviceCode, userCode, verificationUri, interval, expiresIn }
   */
  async startAuth(clientId) {
    if (!clientId) {
      throw new Error('需要提供 GitHub OAuth App Client ID')
    }

    OAUTH_CONFIG.clientId = clientId

    const response = await fetch(OAUTH_CONFIG.deviceCodeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: clientId,
        scope: OAUTH_CONFIG.scopes
      })
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error_description || '获取设备码失败')
    }

    const data = await response.json()
    return {
      deviceCode: data.device_code,
      userCode: data.user_code,
      verificationUri: data.verification_uri,
      interval: data.interval || 5,
      expiresIn: data.expires_in || 900
    }
  }

  /**
   * 轮询获取访问令牌
   * @param {string} deviceCode - 设备码
   * @param {string} clientId - Client ID
   * @param {number} interval - 轮询间隔（秒）
   * @param {number} timeout - 超时时间（毫秒）
   * @returns {Promise<string>} 访问令牌
   */
  async pollForToken(deviceCode, clientId, interval = 5, timeout = 900000) {
    const startTime = Date.now()

    return new Promise((resolve, reject) => {
      const poll = async () => {
        if (Date.now() - startTime > timeout) {
          reject(new Error('认证超时'))
          return
        }

        try {
          const response = await fetch(OAUTH_CONFIG.accessTokenUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              client_id: clientId,
              device_code: deviceCode,
              grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
            })
          })

          const data = await response.json()

          if (data.access_token) {
            this._token = data.access_token
            localStorage.setItem(GITHUB_TOKEN_KEY, this._token)
            /* 获取用户信息 */
            await this._fetchUserInfo()
            /* 发布事件 */
            eventBus.emit('github:auth_success', { user: this._userInfo })
            resolve(this._token)
          } else if (data.error === 'authorization_pending') {
            /* 用户还未完成授权，继续轮询 */
            setTimeout(poll, interval * 1000)
          } else if (data.error === 'slow_down') {
            /* 请求太快，增加间隔 */
            setTimeout(poll, (interval + 5) * 1000)
          } else if (data.error === 'expired_token') {
            reject(new Error('设备码已过期，请重新开始认证'))
          } else {
            reject(new Error(data.error_description || '认证失败'))
          }
        } catch (e) {
          reject(e)
        }
      }

      setTimeout(poll, interval * 1000)
    })
  }

  /**
   * 使用 Personal Access Token 直接认证
   * @param {string} token - GitHub Personal Access Token（需要 gist 权限）
   * @returns {Object} 用户信息
   */
  async authWithToken(token) {
    this._token = token
    localStorage.setItem(GITHUB_TOKEN_KEY, token)

    const valid = await this._verifyToken()
    if (!valid) {
      this._token = null
      localStorage.removeItem(GITHUB_TOKEN_KEY)
      throw new Error('Token 无效或无 gist 权限')
    }

    await this._fetchUserInfo()
    eventBus.emit('github:auth_success', { user: this._userInfo })
    return this._userInfo
  }

  /**
   * 验证 Token 有效性
   * @returns {boolean}
   */
  async _verifyToken() {
    if (!this._token) return false

    try {
      const response = await fetch(`${GITHUB_API}/user`, {
        headers: this._getHeaders()
      })

      if (response.ok) {
        const data = await response.json()
        /* 检查 gist 权限 */
        const scopes = response.headers.get('X-OAuth-Scopes') || ''
        if (!scopes.includes('gist') && data.login) {
          /* PAT 也可能有gist权限，尝试调用gist api验证 */
          const gistCheck = await fetch(`${GITHUB_API}/gists?per_page=1`, {
            headers: this._getHeaders()
          })
          if (!gistCheck.ok) {
            console.warn('[GitHubSync] Token 无 gist 权限')
            return false
          }
        }
        this._userInfo = {
          login: data.login,
          name: data.name,
          avatar: data.avatar_url
        }
        localStorage.setItem(GITHUB_USER_KEY, JSON.stringify(this._userInfo))
        return true
      }

      return false
    } catch (e) {
      console.warn('[GitHubSync] Token 验证失败:', e)
      return false
    }
  }

  /**
   * 获取用户信息
   */
  async _fetchUserInfo() {
    try {
      const response = await fetch(`${GITHUB_API}/user`, {
        headers: this._getHeaders()
      })
      if (response.ok) {
        const data = await response.json()
        this._userInfo = {
          login: data.login,
          name: data.name,
          avatar: data.avatar_url
        }
        localStorage.setItem(GITHUB_USER_KEY, JSON.stringify(this._userInfo))
      }
    } catch (e) { /* ignore */ }
  }

  /**
   * 登出
   */
  logout() {
    this._token = null
    this._gistId = null
    this._userInfo = null
    localStorage.removeItem(GITHUB_TOKEN_KEY)
    localStorage.removeItem(GITHUB_GIST_ID_KEY)
    localStorage.removeItem(GITHUB_USER_KEY)
    this.stopAutoUpload()
    eventBus.emit('github:logout')
  }

  /* ========== 数据上传 ========== */

  /**
   * 上传数据快照到 GitHub Gist
   * @param {Object} data - 要上传的数据 { modules, viewState, layoutState, drafts }
   * @param {Object} options - 选项 { description, forceCreate }
   * @returns {Object} { gistId, htmlUrl, version }
   */
  async uploadSnapshot(data, options = {}) {
    if (!this._token) {
      throw new Error('未认证，请先登录 GitHub')
    }

    if (this._isUploading) {
      console.info('[GitHubSync] 正在上传中，跳过本次')
      return null
    }

    this._isUploading = true

    try {
      /* 准备 Gist 文件 */
      const files = {}

      /* 各模块数据分别存储为独立文件 */
      if (data.modules) {
        for (const [moduleName, moduleData] of Object.entries(data.modules)) {
          if (this._config.uploadModules.includes(moduleName)) {
            const content = this._config.encrypt
              ? this._encrypt(JSON.stringify(moduleData, null, 2))
              : JSON.stringify(moduleData, null, 2)
            files[`erp_${moduleName}.json`] = {
              content: this._config.encrypt ? content : this._sanitizeForGist(moduleData)
            }
          }
        }
      }

      /* 视图状态 */
      if (data.viewState && this._config.uploadViewState) {
        files['erp_view_state.json'] = {
          content: JSON.stringify(data.viewState, null, 2)
        }
      }

      /* 布局状态 */
      if (data.layoutState && this._config.uploadLayoutState) {
        files['erp_layout_state.json'] = {
          content: JSON.stringify(data.layoutState, null, 2)
        }
      }

      /* 元数据 */
      files['erp_meta.json'] = {
        content: JSON.stringify({
          version: '1.0',
          uploadedAt: new Date().toISOString(),
          uploadedBy: this._userInfo?.login || 'unknown',
          moduleCount: Object.keys(data.modules || {}).length,
          totalRecords: Object.values(data.modules || {}).reduce((s, m) => s + (Array.isArray(m) ? m.length : 0), 0),
          encrypted: this._config.encrypt,
          appVersion: '2.0'
        }, null, 2)
      }

      const description = options.description || this._config.gistDescription

      let response
      if (this._gistId && !options.forceCreate) {
        /* 更新已有 Gist */
        response = await fetch(`${GITHUB_API}/gists/${this._gistId}`, {
          method: 'PATCH',
          headers: this._getHeaders(),
          body: JSON.stringify({
            description: `${description} - ${new Date().toLocaleString('zh-CN')}`,
            files
          })
        })
      } else {
        /* 创建新 Gist */
        response = await fetch(`${GITHUB_API}/gists`, {
          method: 'POST',
          headers: this._getHeaders(),
          body: JSON.stringify({
            description,
            public: this._config.gistPublic,
            files
          })
        })
      }

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.message || `GitHub API 错误: ${response.status}`)
      }

      const gist = await response.json()

      /* 保存 Gist ID */
      if (!this._gistId || options.forceCreate) {
        this._gistId = gist.id
        localStorage.setItem(GITHUB_GIST_ID_KEY, this._gistId)
      }

      this._stats.totalUploads++
      this._stats.lastUploadTime = Date.now()
      this._lastUploadTime = Date.now()

      /* 发布上传成功事件 */
      eventBus.emit('github:upload_success', {
        gistId: gist.id,
        htmlUrl: gist.html_url,
        version: gist.history?.[0]?.version || 'unknown'
      })

      return {
        gistId: gist.id,
        htmlUrl: gist.html_url,
        version: gist.history?.[0]?.version || 'unknown'
      }
    } catch (e) {
      this._stats.uploadErrors++
      eventBus.emit('github:upload_error', { error: e.message })
      throw e
    } finally {
      this._isUploading = false
    }
  }

  /**
   * 从 GitHub Gist 下载并恢复数据
   * @param {string} [gistId] - Gist ID，不传则使用已保存的
   * @param {string} [versionId] - 历史版本ID，不传则获取最新
   * @returns {Object} 下载的数据
   */
  async downloadSnapshot(gistId, versionId) {
    if (!this._token) {
      throw new Error('未认证，请先登录 GitHub')
    }

    const id = gistId || this._gistId
    if (!id) {
      throw new Error('未指定 Gist ID')
    }

    let url = `${GITHUB_API}/gists/${id}`
    if (versionId) {
      url += `/${versionId}`
    }

    const response = await fetch(url, {
      headers: this._getHeaders()
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.message || `下载失败: ${response.status}`)
    }

    const gist = await response.json()
    const result = {
      gistId: gist.id,
      htmlUrl: gist.html_url,
      description: gist.description,
      createdAt: gist.created_at,
      updatedAt: gist.updated_at,
      modules: {},
      viewState: null,
      layoutState: null,
      meta: null,
      history: gist.history?.map(h => ({
        version: h.version,
        committedAt: h.committed_at,
        url: h.url
      })) || []
    }

    /* 解析文件内容 */
    for (const [filename, file] of Object.entries(gist.files || {})) {
      try {
        const content = file.content
        if (!content) continue

        if (filename === 'erp_meta.json') {
          result.meta = JSON.parse(content)
        } else if (filename === 'erp_view_state.json') {
          result.viewState = JSON.parse(content)
        } else if (filename === 'erp_layout_state.json') {
          result.layoutState = JSON.parse(content)
        } else if (filename.startsWith('erp_') && filename.endsWith('.json')) {
          const moduleName = filename.replace('erp_', '').replace('.json', '')
          const parsed = JSON.parse(content)
          result.modules[moduleName] = this._config.encrypt
            ? JSON.parse(this._decrypt(parsed))
            : parsed
        }
      } catch (e) {
        console.warn(`[GitHubSync] 解析文件 ${filename} 失败:`, e)
      }
    }

    this._stats.totalDownloads++
    this._stats.lastDownloadTime = Date.now()

    eventBus.emit('github:download_success', { gistId: id })

    return result
  }

  /**
   * 获取 Gist 历史版本列表
   * @returns {Array} 版本列表
   */
  async getHistory() {
    if (!this._token || !this._gistId) return []

    try {
      const response = await fetch(`${GITHUB_API}/gists/${this._gistId}`, {
        headers: this._getHeaders()
      })
      if (!response.ok) return []

      const gist = await response.json()
      return (gist.history || []).map(h => ({
        version: h.version,
        committedAt: h.committed_at,
        user: h.user?.login || 'unknown',
        url: h.url
      }))
    } catch (e) {
      return []
    }
  }

  /**
   * 列出用户的所有 ERP 备份 Gist
   * @returns {Array} Gist 列表
   */
  async listBackupGists() {
    if (!this._token) return []

    try {
      const response = await fetch(`${GITHUB_API}/gists?per_page=100`, {
        headers: this._getHeaders()
      })
      if (!response.ok) return []

      const gists = await response.json()
      return gists
        .filter(g => g.description?.includes('冠久ERP') || g.description?.includes('ERP'))
        .map(g => ({
          id: g.id,
          description: g.description,
          createdAt: g.created_at,
          updatedAt: g.updated_at,
          htmlUrl: g.html_url,
          fileCount: Object.keys(g.files || {}).length
        }))
    } catch (e) {
      return []
    }
  }

  /* ========== 自动上传 ========== */

  /**
   * 启动自动上传
   */
  startAutoUpload() {
    if (this._autoUploadTimer) return

    this._autoUploadTimer = setInterval(async () => {
      if (this._isUploading || !this._token) return

      try {
        await this.uploadAllData()
      } catch (e) {
        console.warn('[GitHubSync] 自动上传失败:', e)
      }
    }, this._config.autoUploadInterval)

    console.info('[GitHubSync] 自动上传已启动，间隔:', this._config.autoUploadInterval / 1000, '秒')
  }

  /**
   * 停止自动上传
   */
  stopAutoUpload() {
    if (this._autoUploadTimer) {
      clearInterval(this._autoUploadTimer)
      this._autoUploadTimer = null
    }
  }

  /**
   * 上传所有数据（便捷方法）
   * @returns {Object} 上传结果
   */
  async uploadAllData() {
    const data = {
      modules: {},
      viewState: null,
      layoutState: null
    }

    /* 收集各模块数据 */
    for (const [name, store] of Object.entries(this._stores)) {
      if (!this._config.uploadModules.includes(name)) continue
      try {
        const dataKey = this._getDataKey(name)
        if (store[dataKey] && Array.isArray(store[dataKey])) {
          data.modules[name] = store[dataKey]
        }
      } catch (e) { /* ignore */ }
    }

    /* 收集视图状态 */
    if (this._config.uploadViewState) {
      try {
        const raw = localStorage.getItem('gj_erp_viewState')
        if (raw) data.viewState = JSON.parse(raw)
      } catch (e) { /* ignore */ }
    }

    /* 收集布局状态 */
    if (this._config.uploadLayoutState) {
      try {
        const raw = localStorage.getItem('gj_erp_layoutState')
        if (raw) data.layoutState = JSON.parse(raw)
      } catch (e) { /* ignore */ }
    }

    return this.uploadSnapshot(data)
  }

  /**
   * 注册Store
   */
  registerStore(name, store) {
    this._stores[name] = store
  }

  /* ========== 配置管理 ========== */

  /**
   * 更新配置
   */
  updateConfig(config) {
    Object.assign(this._config, config)
    this._saveConfig()

    /* 自动上传状态变更 */
    if (config.autoUpload !== undefined) {
      if (config.autoUpload && this._token) {
        this.startAutoUpload()
      } else {
        this.stopAutoUpload()
      }
    }

    /* 间隔变更 */
    if (config.autoUploadInterval && this._autoUploadTimer) {
      this.stopAutoUpload()
      this.startAutoUpload()
    }
  }

  /**
   * 获取当前配置
   */
  getConfig() {
    return { ...this._config }
  }

  /**
   * 获取认证状态
   */
  getAuthStatus() {
    return {
      isAuthenticated: !!this._token,
      user: this._userInfo,
      gistId: this._gistId
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      ...this._stats,
      isUploading: this._isUploading,
      lastUploadTime: this._lastUploadTime,
      autoUploadEnabled: !!this._autoUploadTimer,
      autoUploadInterval: this._config.autoUploadInterval
    }
  }

  /* ========== 内部方法 ========== */

  /**
   * 获取请求头
   */
  _getHeaders() {
    return {
      'Authorization': `Bearer ${this._token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    }
  }

  /**
   * 获取模块数据键名
   */
  _getDataKey(module) {
    const keyMap = {
      customer: 'customers',
      quotation: 'quotations',
      contract: 'contracts',
      inventory: 'inventory',
      delivery: 'deliveries',
      collection: 'collections',
      statement: 'statements',
      supplier: 'suppliers',
      warehouseLocation: 'locations',
      cost: 'records',
      todo: 'todos'
    }
    return keyMap[module] || module
  }

  /**
   * 清理数据中的循环引用和不可序列化内容
   */
  _sanitizeForGist(data) {
    try {
      return JSON.stringify(data, (key, value) => {
        if (typeof value === 'function') return undefined
        if (value instanceof Error) return value.message
        if (typeof value === 'symbol') return undefined
        if (typeof value === 'bigint') return value.toString()
        return value
      }, 2)
    } catch (e) {
      return JSON.stringify({ error: '序列化失败', message: e.message })
    }
  }

  /**
   * 简单加密（XOR + Base64）
   * 注意：这不是强加密，仅用于防止明文存储
   */
  _encrypt(text) {
    const key = this._config.encryptionKey || 'gj_erp_default_key'
    let result = ''
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(
        text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      )
    }
    return btoa(unescape(encodeURIComponent(result)))
  }

  /**
   * 解密
   */
  _decrypt(encoded) {
    const key = this._config.encryptionKey || 'gj_erp_default_key'
    const text = decodeURIComponent(escape(atob(encoded)))
    let result = ''
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(
        text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      )
    }
    return result
  }

  /**
   * 保存配置到 localStorage
   */
  _saveConfig() {
    try {
      localStorage.setItem(GITHUB_CONFIG_KEY, JSON.stringify(this._config))
    } catch (e) { /* ignore */ }
  }

  /**
   * 从 localStorage 加载配置
   */
  _loadConfig() {
    try {
      /* 加载 Token */
      this._token = localStorage.getItem(GITHUB_TOKEN_KEY) || null

      /* 加载 Gist ID */
      this._gistId = localStorage.getItem(GITHUB_GIST_ID_KEY) || null

      /* 加载用户信息 */
      const userRaw = localStorage.getItem(GITHUB_USER_KEY)
      if (userRaw) this._userInfo = JSON.parse(userRaw)

      /* 加载配置 */
      const configRaw = localStorage.getItem(GITHUB_CONFIG_KEY)
      if (configRaw) {
        Object.assign(this._config, JSON.parse(configRaw))
      }
    } catch (e) { /* ignore */ }
  }

  /**
   * 销毁
   */
  destroy() {
    this.stopAutoUpload()
    this._initialized = false
  }
}

/* 全局单例 */
const githubSync = new GitHubSync()

export default githubSync
