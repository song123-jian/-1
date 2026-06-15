# 冠久ERP v3.0.0 改进实施总结方案

**项目名称**: dperp-vue (冠久ERP)
**版本**: 3.0.0
**实施日期**: 2026-06-15
**测试结果**: 71个测试文件 / 2790个用例全部通过 / ESLint 0 errors

---

## 一、已实施改进项总览

| # | 改进项 | 优先级 | 涉及文件 | 状态 |
|---|--------|--------|----------|------|
| 8 | 统一错误处理策略 - 创建 logger 工具 | 高 | src/utils/logger.js (新建) | 已完成 |
| 21 | 修复同步引擎 Store 缓存泄漏 | 高 | src/utils/syncEngine.js | 已完成 |
| 22 | 修复同步状态竞态条件 - 分离拉取/推送锁 | 高 | src/utils/syncEngine.js | 已完成 |
| 26 | 实时订阅自动重连机制 | 高 | src/lib/supabase.js | 已完成 |
| 28 | 版本控制存储优化 - 改为差异存储 | 高 | src/utils/versionControl.js | 已完成 |
| 34 | Supabase 连接信息安全加固 | 高 | src/lib/supabase.js | 已完成 |
| 35 | 工作流实例持久化 | 高 | src/utils/workflowEngine.js | 已完成 |
| 36 | 修复超时检查逻辑 - 基于节点到达时间 | 高 | src/utils/workflowEngine.js | 已完成 |
| 23 | 墓碑机制过期清理 | 中 | src/utils/syncEngine.js | 已完成 |
| 24 | 冲突解决器 JSON 比较缺陷修复 | 中 | src/utils/conflictResolver.js | 已完成 |
| 39 | v-permission 指令改用 DOM 移除 | 中 | src/utils/permissionGuard.js | 已完成 |
| 40 | 权限检查硬编码角色名统一化 | 中 | src/constants/roles.js (新建), src/router/index.js | 已完成 |
| 4 | 路由权限硬编码 - 引入角色常量 | 中 | src/constants/roles.js, src/router/index.js | 已完成 |
| 27 | localStorage 配额预警 | 中 | src/utils/autoSave.js | 已完成 |
| 30 | autoSave 后台定时器优化 | 低 | src/utils/autoSave.js | 已完成 |

---

## 二、各改进项详细说明

### #8 统一错误处理策略 - 创建 logger 工具
**文件**: `src/utils/logger.js` (新建)
**改动内容**:
- 创建 `createLogger(module)` 工厂函数，替代散落的 `console.info/warn/error` 调用
- 支持日志级别控制（DEBUG/INFO/WARN/ERROR/SILENT），生产环境默认 WARN
- 提供 `safeExecute(fn, fallback, module)` 和 `safeExecuteAsync(fn, fallback, module)` 安全执行函数
- 日志缓冲区（最多200条），支持 `getLogBuffer()` 获取历史日志
- 全局错误处理器注册 `onError(handler)`
- 自动捕获 `window.onerror` 和 `unhandledrejection`

### #21 修复同步引擎 Store 缓存泄漏
**文件**: `src/utils/syncEngine.js`
**改动内容**:
- 在 `stopAutoSync()` 中添加 `_storeCache.clear()`，清理 Store 实例缓存
- 防止应用生命周期内 Store 引用持续累积导致内存泄漏

### #22 修复同步状态竞态条件
**文件**: `src/utils/syncEngine.js`
**改动内容**:
- 将 `isSyncing` 拆分为 `isPulling` 和 `isPushing` 两个独立锁
- `isSyncing` 改为 `computed(() => isPulling.value || isPushing.value)` 兼容旧接口
- `incrementalPullAll` 使用 `isPulling` 锁
- `incrementalPushAll` 使用 `isPushing` 锁
- `forceFullSync` 同时持有两把锁
- 允许拉取和推送并行执行，提升同步效率

### #26 实时订阅自动重连机制
**文件**: `src/lib/supabase.js`
**改动内容**:
- 新增 `scheduleReconnect()` 函数，实现指数退避重连策略
- 基础延迟 3 秒，最大延迟 60 秒，每次失败延迟翻倍
- `init()` 中监听客户端连接状态变化，重连成功后重置计数器
- `disconnect()` 中清理重连定时器和计数器
- 导出 `scheduleReconnect` 供外部调用

### #28 版本控制存储优化
**文件**: `src/utils/versionControl.js`
**改动内容**:
- 新增 `_computeDiff(oldData, newData)` 方法，计算字段级差异而非存储完整快照
- `recordVersion` 不再存储 `oldData`，改为存储 `changes` diff 数组
- 仅保留最新版本的 `newData`（用于恢复），旧版本删除 `newData` 节省空间
- 新增 `_reconstructData(module, itemId, targetVersion)` 方法，通过重放 changes 重建历史数据
- `restoreVersion` 对旧版本调用 `_reconstructData` 重建完整数据
- 新增 `_migrateVersions()` 方法，自动将旧格式数据迁移为新格式
- `_loadFromStorage` 加载时自动执行迁移

### #34 Supabase 连接信息安全加固
**文件**: `src/lib/supabase.js`
**改动内容**:
- `STORAGE_KEY_KEY` (anon key) 存储从 `localStorage` 改为 `sessionStorage`
- 关闭标签页后密钥自动清除，避免长期残留
- `STORAGE_URL_KEY` (URL) 保持在 `localStorage`（非敏感信息）
- `autoInit` 和 `disconnect` 同步调整读写目标

### #35 工作流实例持久化
**文件**: `src/utils/workflowEngine.js`
**改动内容**:
- 新增 `INSTANCES_STORAGE_KEY` 常量
- 构造函数中初始化 `_instances` Map，调用 `_loadInstances()` 加载已有数据
- 新增 `_loadInstances()` 和 `_saveInstances()` 方法
- `startInstance`、`approve`、`delegate`、`addApprover` 操作后自动持久化
- 新增 `getInstances(templateId?)` 方法查询持久化实例
- 新增 `deleteInstance(instanceId)` 方法删除实例

### #36 修复超时检查逻辑
**文件**: `src/utils/workflowEngine.js`
**改动内容**:
- `startInstance` 中新增 `currentNodeArrivalTime` 字段
- `approve` 流转到下一节点时更新 `currentNodeArrivalTime`
- `checkTimeout` 使用 `inst.currentNodeArrivalTime || inst.startTime` 计算超时
- 向后兼容无 `currentNodeArrivalTime` 的旧实例

### #23 墓碑机制过期清理
**文件**: `src/utils/syncEngine.js`
**改动内容**:
- 新增 `TOMBSTONE_TTL = 30天` 常量
- 墓碑存储格式从 `Set<id>` 改为 `Map<id, timestamp>`
- localStorage 格式从 `{ table: [id1, id2] }` 改为 `{ table: { id: timestamp } }`
- `loadDeletedIds()` 兼容旧格式（数组）和新格式（对象）
- `isDeletedId()` 检查 TTL，过期条目自动移除
- 新增 `cleanupTombstones()` 函数，`saveDeletedIds()` 内自动调用
- 导出 `cleanupTombstones`

### #24 冲突解决器深比较修复
**文件**: `src/utils/conflictResolver.js`
**改动内容**:
- 新增 `deepEqual(a, b)` 导出函数，递归处理 null/undefined、原始类型、数组、对象
- `detectConflicts` 中 `JSON.stringify` 比较替换为 `deepEqual`
- 解决键序不同导致误判冲突的问题

### #39 v-permission 指令 DOM 移除
**文件**: `src/utils/permissionGuard.js`
**改动内容**:
- `mounted`: 权限拒绝时创建 `<!-- v-permission: denied -->` 注释占位符
- 用 `replaceChild` 替换元素，存储在 `el.__vPerm`
- `updated`: 权限恢复时从占位符还原元素；权限拒绝时替换为占位符
- 确保无权限元素真正从 DOM 移除，不可通过开发者工具查看

### #40 + #4 角色常量统一化
**文件**: `src/constants/roles.js` (新建), `src/router/index.js`
**改动内容**:
- 新建 `src/constants/roles.js`，导出 `Roles` 枚举和 `RoleGroups` 分组
- `Roles`: ADMIN/GM/SALES_MANAGER/SALES/WAREHOUSE_MANAGER/WAREHOUSE/FINANCE/VIEWER
- `RoleGroups`: ADMIN_AND_GM / FINANCE_ACCESS / WAREHOUSE_ACCESS
- 路由文件中 4 处硬编码角色数组替换为 `RoleGroups` 引用

### #27 localStorage 配额预警
**文件**: `src/utils/autoSave.js`
**改动内容**:
- 新增 `STORAGE_QUOTA_WARNING = 0.8` 常量（80% 阈值）
- 新增 `getStorageUsage()` 方法，遍历 localStorage 计算使用量
- `_saveToStorage()` 保存前检查使用率，超过阈值通过 eventBus 发出警告

### #30 autoSave 后台定时器优化
**文件**: `src/utils/autoSave.js`
**改动内容**:
- 新增 `visibilitychange` 事件监听
- 页面进入后台时暂停 `setInterval` 定时器
- 页面回到前台时：如有脏数据立即保存，然后重启定时器
- `destroy()` 中清理 visibilitychange 监听器

---

## 三、测试验证结果

### 单元测试
```
Test Files:  71 passed (71)
Tests:       2790 passed (2790)
Duration:    99.94s
```

### ESLint 检查
```
0 errors, 7 warnings (均为原有代码的 no-unused-vars，非本次改动引入)
```

---

## 四、新增文件清单

| 文件路径 | 用途 |
|----------|------|
| src/utils/logger.js | 统一日志与错误处理工具 |
| src/constants/roles.js | 角色常量与分组定义 |

---

## 五、修改文件清单

| 文件路径 | 修改内容摘要 |
|----------|-------------|
| src/utils/syncEngine.js | 分离拉取/推送锁、Store缓存清理、墓碑TTL过期清理 |
| src/lib/supabase.js | 自动重连机制、anonKey改sessionStorage |
| src/utils/versionControl.js | 差异存储替代完整快照、数据迁移 |
| src/utils/workflowEngine.js | 实例持久化、超时检查基于节点到达时间 |
| src/utils/conflictResolver.js | deepEqual 替代 JSON.stringify 比较 |
| src/utils/permissionGuard.js | v-permission 指令 DOM 移除替代 hidden |
| src/utils/autoSave.js | 配额预警、后台定时器暂停 |
| src/router/index.js | 使用 RoleGroups 替代硬编码角色数组 |

---

## 六、未实施项（建议后续迭代）

| # | 改进项 | 优先级 | 原因 |
|---|--------|--------|------|
| 1 | 拆分大组件（Customers.vue 820行等） | 高 | 需要业务方确认拆分策略，影响面广 |
| 2 | 统一存储引擎 useStorageEngine | 高 | 需要逐个 store 改造，工作量大 |
| 6 | 统一智能识别逻辑 | 高 | 各模块 SmartRecognize 需逐个对齐 |
| 11 | 首屏性能优化（分页+虚拟滚动） | 高 | 需要后端配合分页 API |
| 15-17 | 安全加固（RLS对齐、v-html审计） | 高 | 需要后端/运维配合 |
| 10 | 逐步引入 TypeScript | 低 | 长期工程，需制定迁移计划 |
| 18-20 | 测试覆盖增强、E2E测试、ESLint统一 | 中 | 工程化改进，可逐步推进 |
| 38 | 并行/会签/或签模式实现 | 高 | 需要产品确认审批流程需求 |

---

## 七、后续建议

1. **短期（1-2周）**: 完成未实施的高优先级项 #1、#2、#6，重点关注组件拆分和存储引擎统一
2. **中期（1个月）**: 完成 #11 首屏性能优化、#15-17 安全加固，引入 E2E 测试
3. **长期（季度）**: TypeScript 迁移、工作流引擎并行模式实现、全量测试覆盖提升
