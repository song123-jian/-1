# 冠久ERP v3.0.0 身份选择页面改进实施报告

**实施日期**: 2026-06-15
**测试结果**: 84个测试文件 / 3193个测试用例全部通过 / 零回归

---

## 一、改进项总览

| # | 改进项 | 涉及文件 | 状态 |
|---|--------|----------|------|
| 1 | 角色分组展示 | src/constants/roles.js, src/views/RoleSelect.vue | 已完成 |
| 2 | "记住我的身份"复选框 | src/views/RoleSelect.vue, src/stores/session.js | 已完成 |
| 3 | 上次使用标签 | src/views/RoleSelect.vue | 已完成 |
| 4 | 单人模式自动检测 | src/stores/session.js, src/views/RoleSelect.vue | 已完成 |
| 5 | 顶部栏角色快速切换 | src/layouts/AppTopbar.vue | 已完成 |
| 6 | 底部文案适配 | src/views/RoleSelect.vue | 已完成 |
| 7 | 会话超时延长（单人24h） | src/stores/session.js | 已完成 |

---

## 二、详细改动

### 1. 角色分组展示

**文件**: `src/constants/roles.js`

新增 `RoleCategories` 导出，将8个角色按职能分为4组：

```javascript
export const RoleCategories = [
  { label: '管理', roles: [
    { name: '管理员', icon: 'users', desc: '系统配置与全部权限' },
    { name: '总经理', icon: 'building', desc: '全局数据查看与审批' }
  ]},
  { label: '销售', roles: [
    { name: '销售主管', icon: 'table', desc: '销售团队管理与审批' },
    { name: '销售员', icon: 'dollar', desc: '客户与报价订单管理' }
  ]},
  { label: '仓储', roles: [
    { name: '仓库主管', icon: 'package', desc: '仓库管理与库存审批' },
    { name: '仓管员', icon: 'tool', desc: '出入库与库存操作' }
  ]},
  { label: '财务', roles: [
    { name: '财务', icon: 'calculator', desc: '回款对账与财务报表' },
    { name: '查看者', icon: 'eye', desc: '只读查看所有数据' }
  ]}
]
```

**页面效果**: 角色卡片按分组排列，每组有分隔线标题，2列网格布局。

### 2. "记住我的身份"复选框

**文件**: `src/views/RoleSelect.vue`, `src/stores/session.js`

- 新增 `rememberRole` 复选框，勾选后保存角色到 `localStorage`（key: `gj_erp_remembered_role`）
- `selectRole(role, remember)` 新增第二参数 `remember`
- 勾选时：保存角色到 `rememberedRole` + `localStorage`
- 取消勾选时：清除 `rememberedRole` + `localStorage`
- 页面加载时：检测 `rememberedRole`，自动选中该角色并勾选复选框

### 3. 上次使用标签

**文件**: `src/views/RoleSelect.vue`

- 当 `sessionStore.rememberedRole === role.name` 时，在角色卡片右上角显示蓝色"上次使用"徽章
- 帮助用户快速定位上次使用的角色

### 4. 单人模式自动检测

**文件**: `src/stores/session.js`, `src/views/RoleSelect.vue`

- 新增 `isSoloMode` ref，当 `rememberedRole` 存在时自动设为 `true`
- 单人模式下：
  - 隐藏在线成员区域（`v-if="!sessionStore.isSoloMode"`）
  - 底部文案显示"个人使用模式 · 自动记住身份"
  - 会话超时延长至24小时

### 5. 顶部栏角色快速切换

**文件**: `src/layouts/AppTopbar.vue`

- 用户头像旁显示当前角色名称和下拉箭头
- 点击展开角色切换下拉菜单，列出所有8个角色
- 当前角色显示 ✓ 标记
- 点击其他角色立即切换（调用 `sessionStore.switchRole(role)`）
- 切换后自动刷新页面以重新加载权限相关数据
- 底部"退出登录"按钮，调用 `sessionStore.clearSession()` 并跳转到选择页

新增 `sessionStore.switchRole(role)` 方法：
- 保留设备指纹
- 更新角色、会话ID、登录时间
- 如果有 `rememberedRole`，同步更新
- 持久化到 localStorage

### 6. 底部文案适配

**文件**: `src/views/RoleSelect.vue`

```html
{{ sessionStore.isSoloMode ? '个人使用模式 · 自动记住身份' : '团队共享模式 · 无需个人账号密码' }}
```

### 7. 会话超时延长

**文件**: `src/stores/session.js`

| 模式 | 超时时间 | 判断条件 |
|------|----------|----------|
| 团队模式 | 30分钟 | `isSoloMode = false` |
| 单人模式 | 24小时 | `isSoloMode = true` |

`checkSessionExpiry` 和 `restoreSession` 均根据 `isSoloMode` 选择超时时间。

---

## 三、新增/修改 API

### session.js 新增方法

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `switchRole(newRole)` | `newRole: string` | `boolean` | 快速切换角色，无需退出到选择页 |
| `autoLoginWithRememberedRole()` | 无 | `boolean` | 使用记住的角色自动登录 |
| `setRememberRole(remember)` | `remember: boolean` | `void` | 设置/取消记住当前角色 |

### session.js 新增属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `rememberedRole` | `ref<string\|null>` | 记住的角色名称 |
| `isSoloMode` | `ref<boolean>` | 是否为单人使用模式 |

### selectRole 签名变更

```javascript
// 修改前
selectRole(role)

// 修改后
selectRole(role, remember = false)
```

---

## 四、测试更新

| 测试文件 | 更新内容 |
|----------|----------|
| src/__tests__/components/RoleSelect.test.js | 更新 selectRole 调用参数、新增记住身份测试(3个)、单人模式测试(2个) |

测试用例从 19 个增加到 23 个。

---

## 五、全量测试结果

```
Test Files  84 passed (84)
Tests       3193 passed (3193)
Duration    145.71s
```

零回归，所有改动均通过验证。

---

## 六、修改文件清单

| 文件路径 | 修改类型 | 修改内容 |
|----------|----------|----------|
| src/constants/roles.js | 扩展 | 新增 RoleCategories 角色分组定义 |
| src/stores/session.js | 扩展 | 新增 rememberedRole/isSoloMode、switchRole/autoLoginWithRememberedRole/setRememberRole、会话超时策略 |
| src/views/RoleSelect.vue | 重写 | 分组布局、记住身份复选框、上次使用标签、单人模式适配、响应式 |
| src/layouts/AppTopbar.vue | 扩展 | 角色快速切换下拉菜单、角色名显示、退出登录 |
| src/__tests__/components/RoleSelect.test.js | 更新 | 适配新 API、新增记住身份和单人模式测试 |
