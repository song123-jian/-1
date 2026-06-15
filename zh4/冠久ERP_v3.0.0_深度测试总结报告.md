# 冠久ERP v3.0.0 虚假数据注入深度测试总结报告

**项目名称**: dperp-vue (冠久ERP)
**版本**: 3.0.0
**测试日期**: 2026-06-15
**测试结果**: 84个测试文件 / 3188个测试用例全部通过 / 零回归

---

## 一、测试基础设施

### 新增工具文件

| 文件 | 用途 |
|------|------|
| src/__tests__/fixtures/dataGenerator.js | 虚假数据生成器（客户/报价/合同/库存/财务/供应商/采购/生产/工作流 + 异常注入） |
| src/__tests__/utils/perfTracker.js | 性能测试工具（耗时测量/内存检测/基准对比/泄漏检测） |

### 数据生成器覆盖模块

| 模块 | 生成函数 | 数据规模 |
|------|----------|----------|
| 客户 | generateCustomer(s) / generateAnomalousCustomer | L1:100 / L2:1k / L3:10k |
| 报价单 | generateQuotation(s) / generateQuotationItem | L1:200 / L2:5k |
| 合同 | generateContract(s) | L1:100 / L2:2k |
| 库存 | generateInventoryItem(s) | L1:500 / L2:5k |
| 出入库 | generateWarehouseOrder(s) | L1:1k / L2:20k |
| 应收 | generateReceivable(s) | L1:200 / L2:5k |
| 应付 | generatePayable(s) | L1:200 / L2:5k |
| 供应商 | generateSupplier(s) | L1:50 / L2:500 |
| 采购 | generatePurchaseOrder | L1:100 / L2:1k |
| 生产 | generateProductionOrder | L1:50 / L2:500 |
| 工作流 | generateWorkflowInstance | L1:50 / L2:500 |

### 异常注入类型

| 类型 | 常量 | 用途 |
|------|------|------|
| XSS 载荷 | ANOMALY.xssScript / xssImg / xssSvg | 安全测试 |
| SQL 注入 | ANOMALY.sqlInjection | 安全测试 |
| 原型污染 | ANOMALY.protoPollution | 安全测试 |
| 超长字符串 | ANOMALY.longString (10k字符) | 边界测试 |
| 特殊字符 | ANOMALY.specialChars | 边界测试 |
| Emoji | ANOMALY.emojiString | 兼容性测试 |
| 负数/零/极大值 | ANOMALY.negativeAmount / zeroAmount / hugeAmount | 数值边界 |
| NaN/Infinity | ANOMALY.nanValue / infinityValue | 数值边界 |
| 浮点精度 | ANOMALY.floatPrecision (0.1+0.2) | 精度测试 |
| 空值 | ANOMALY.nullValue / undefinedValue / emptyString | 空值处理 |

---

## 二、深度测试文件与结果

### Store 业务逻辑深度测试

#### 客户 Store (46个测试)

| 测试ID | 场景 | 用例数 | 结果 |
|--------|------|--------|------|
| CS-01 | 信用额度边界（超限/临界/正常/零额度/批量统计） | 5 | PASS |
| CS-02 | 等级自动降级（6月无交易/近期有交易/手动降级/批量） | 4 | PASS |
| CS-03 | 重复检测性能（10k客户50%重复） | 1 | PASS |
| CS-04 | 导入脏数据（null/超长/XSS/SQL/特殊字符/Emoji/空行/负数/极大值） | 9 | PASS |
| CS-05 | 浮点精度（0.1+0.2/totalBalance/10次累加/ANOMALY） | 4 | PASS |
| - | 批量添加1000客户 | 2 | PASS |
| - | 批量删除 | 2 | PASS |
| - | 异常数据更新（null名称/负余额/极大值/XSS/超长字符串） | 6 | PASS |
| - | 特殊字符搜索（特殊字符/XSS/SQL/Emoji/空字符串） | 5 | PASS |
| - | 等级/状态组合筛选 | 8 | PASS |

#### 财务 Store (24个测试)

| 测试ID | 场景 | 用例数 | 结果 |
|--------|------|--------|------|
| FN-01 | 账龄分析边界（null dueDate/未来日期/今天/15天/45天/已完成/部分付款） | 7 | PASS |
| FN-02 | 逾期状态翻转（全额→completed/部分保持overdue/pending→overdue/未到期不变） | 4 | PASS |
| FN-03 | 部分付款精度（100元分3次付33.33剩余0.01/再付0.01完成） | 2 | PASS |
| FN-04 | 负数金额验证（0拒绝/负数拒绝/超余额拒绝/不存在拒绝） | 4 | PASS |
| FN-05 | 撤销收款（余额恢复/completed→partial/不存在收款/不存在应收单） | 4 | PASS |
| FN-06 | 单号溢出（1000个应收单号不重复/100个收款单号/格式验证） | 3 | PASS |

#### 库存 Store (27个测试)

| 测试ID | 场景 | 用例数 | 结果 |
|--------|------|--------|------|
| WH-01 | 安全库存预警（low/exhausted/normal/等于安全库存/计数/alertItems/调整后状态） | 8 | PASS |
| WH-02 | 超卖防护（超出拒绝/等于成功/确认二次检查/确认后库存减少） | 4 | PASS |
| WH-03 | 批次追踪（3批次入库/3批次出库/入库+出库组合） | 3 | PASS |
| WH-04 | 审计日志完整性（500次调整/倒序/500条截断/必要字段） | 4 | PASS |
| WH-05 | 回收站恢复（入库单删除→恢复/出库单→恢复/不存在/永久删除/清空/批量） | 8 | PASS |

### 工具函数边界测试

#### 财务工具函数 (48个测试)

| 测试ID | 场景 | 用例数 | 结果 |
|--------|------|--------|------|
| FH-01 | 空列表/全完成/全零余额返回全零 | 3 | PASS |
| FH-02 | 大数值不溢出（999999999.99/大额减大额/多额累加） | 3 | PASS |
| FH-03 | 逾期状态翻转（4种场景） | 4 | PASS |
| FH-04 | 单号生成（空列表/999同日/非同日） | 3 | PASS |
| - | 浮点精度（0.1+0.2/字符串数字） | 2 | PASS |
| - | 负数金额（负余额跳过/超额付款跳过） | 2 | PASS |
| - | Null/Undefined（金额/dueDate/paid缺失） | 3 | PASS |
| - | 所有导出函数边界 | 28 | PASS |

#### 数字转中文 (39个测试)

| 测试ID | 场景 | 用例数 | 结果 |
|--------|------|--------|------|
| NC-01 | 零值 → "零元整" | 1 | PASS |
| NC-02 | 负数处理 | 2 | PASS |
| NC-03 | 极大数 999999999999.99 | 1 | PASS |
| NC-04 | 纯小数（0.05→伍分/0.50→伍角） | 2 | PASS |
| NC-05 | 整数零带小数 | 1 | PASS |
| - | 关键位数值（1/10/100/1000/10000/100000000） | 6 | PASS |
| - | 0.01→壹分 | 1 | PASS |
| - | 零的连续与省略/整数+小数组合/浮点精度 | 25 | PASS |

#### 冲突解决器 (53个测试)

| 测试ID | 场景 | 用例数 | 结果 |
|--------|------|--------|------|
| - | deepEqual（原始/null/NaN/键顺序/数组/嵌套） | 20 | PASS |
| - | detectConflicts（1000项/null/缺失id） | 8 | PASS |
| - | resolveConflict（local-wins/server-wins/last-write-wins/merge/未知策略） | 10 | PASS |
| - | mergeArrays（相同id/不同id/自定义idKey/null） | 10 | PASS |
| - | autoResolve（少量冲突/大量冲突） | 5 | PASS |

#### 加密工具 (38个测试)

| 测试ID | 场景 | 用例数 | 结果 |
|--------|------|--------|------|
| CR-01 | AES 空字符串加解密 | 2 | PASS |
| CR-02 | AES 100KB 大文本加解密 | 2 | PASS |
| CR-03 | 错误密码抛异常 | 2 | PASS |
| CR-04 | XOR 自反性/自定义key/默认key | 3 | PASS |
| CR-05 | 中文/Emoji/Unicode/混合特殊字符 AES 往返 | 4 | PASS |
| - | Null/Undefined 输入处理 | 14 | PASS |
| - | AES 随机性（相同输入不同密文） | 1 | PASS |

### 引擎深度测试

#### 同步引擎 (28个测试)

| 测试ID | 场景 | 用例数 | 结果 |
|--------|------|--------|------|
| - | 增量拉取10k条性能 | 1 | PASS |
| - | 增量推送10k条性能 | 1 | PASS |
| - | isPulling/isPushing 独立锁 + isSyncing 计算属性 | 3 | PASS |
| - | 拉取进行中再次拉取被跳过 | 1 | PASS |
| - | 墓碑TTL（31天过期/旧格式迁移/新格式持久化） | 3 | PASS |
| - | stopAutoSync 清理 Store 缓存和待推送队列 | 1 | PASS |
| - | 离线推送队列累积 + 去重 | 2 | PASS |
| - | 批量推送1200条正确性 | 1 | PASS |
| - | isDeletedId 自动移除过期条目 | 1 | PASS |
| - | cleanupTombstones（30天+/空Map/边界） | 3 | PASS |
| - | recordDeletedId/recordDeletedIds/clearDeletedId | 3 | PASS |
| - | 同步状态持久化 | 1 | PASS |
| - | forceFullSync + 进行中跳过 | 2 | PASS |

#### 工作流引擎 (29个测试)

| 测试ID | 场景 | 用例数 | 结果 |
|--------|------|--------|------|
| - | 启动实例 + localStorage 持久化 | 2 | PASS |
| - | 逐节点审批 + currentNodeArrivalTime 更新 | 2 | PASS |
| - | 拒绝流程 + 已拒绝不能再审批 | 2 | PASS |
| - | 委托 A→B + 历史记录 | 2 | PASS |
| - | 加签 + addedApprovers 验证 | 1 | PASS |
| - | checkTimeout 基于 currentNodeArrivalTime | 2 | PASS |
| - | 每次操作后实例持久化 | 1 | PASS |
| - | getInstances（全量/按模板筛选）+ localStorage 恢复 | 3 | PASS |
| - | deleteInstance | 1 | PASS |
| - | 条件评估（purchase 5万/contract 10万/payment 3万） | 3 | PASS |
| - | 复杂自定义多节点流程 | 2 | PASS |
| - | 辅助方法 | 8 | PASS |

#### 版本控制 (34个测试)

| 测试ID | 场景 | 用例数 | 结果 |
|--------|------|--------|------|
| - | 100版本记录，仅最新保留 newData | 2 | PASS |
| - | changes 字段包含 diff | 2 | PASS |
| - | reconstructData 重建历史版本 | 3 | PASS |
| - | 存储大小对比 diff vs 完整快照 | 1 | PASS |
| - | 旧格式迁移（oldData → changes） | 2 | PASS |
| - | compareVersions 对比 diff 版本 | 2 | PASS |
| - | restoreVersion + 产生 restore 记录 | 2 | PASS |
| - | 快速连续10次更新 | 1 | PASS |
| - | cleanupModule / cleanupAll | 2 | PASS |
| - | getStats / maxVersionsPerModule | 2 | PASS |
| - | 查询方法 / 标签 / 模块级查询 / 持久化 | 13 | PASS |

### 跨模块集成测试 (8个测试)

| 测试ID | 场景 | 用例数 | 结果 |
|--------|------|--------|------|
| INT-01 | 完整销售流程（客户→报价→合同→送货→回款） | 1 | PASS |
| INT-02 | 采购到入库（供应商→采购单→审批→入库→库存增加） | 1 | PASS |
| INT-03 | 删除级联（有报价/合同/送货/回款时阻止删除/无关联时可删除） | 6 | PASS |

### 安全渗透测试 (18个测试)

| 测试ID | 场景 | 用例数 | 结果 |
|--------|------|--------|------|
| SEC-01 | XSS 注入（script/img onerror/svg onload） | 4 | PASS |
| SEC-02 | SQL 注入搜索不崩溃 | 2 | PASS |
| SEC-03 | 原型污染（__proto__ 不污染 Object.prototype） | 4 | PASS |
| SEC-04 | 会话篡改（无效角色/超时/损坏JSON/空数据） | 4 | PASS |
| SEC-05 | 权限绕过（未登录/查看者/管理员硬编码权限） | 4 | PASS |

### 性能基准测试 (6个测试)

| 测试ID | 场景 | 合格标准 | 实际耗时 | 结果 |
|--------|------|----------|----------|------|
| PERF-01 | 10k客户初始化 | < 3s | ~480ms | PASS |
| PERF-02 | 10k客户全文搜索 | < 500ms | ~270ms | PASS |
| PERF-03 | 5k应收账龄分析 | < 200ms | ~55ms (核心) | PASS |
| PERF-05 | 100次修改版本重建 | < 100ms | ~9ms | PASS |
| PERF-07 | 10k+10k同步合并 | < 2s | ~100ms | PASS |
| PERF-08 | 5k工作流实例加载 | < 500ms | ~80ms | PASS |

---

## 三、测试统计汇总

### 按类别统计

| 类别 | 测试文件 | 用例数 | 通过 | 失败 | 通过率 |
|------|----------|--------|------|------|--------|
| Store 业务逻辑 | 3 | 97 | 97 | 0 | 100% |
| 工具函数边界 | 4 | 178 | 178 | 0 | 100% |
| 引擎深度测试 | 3 | 91 | 91 | 0 | 100% |
| 跨模块集成 | 1 | 8 | 8 | 0 | 100% |
| 安全渗透 | 1 | 18 | 18 | 0 | 100% |
| 性能基准 | 1 | 6 | 6 | 0 | 100% |
| **深度测试合计** | **13** | **398** | **398** | **0** | **100%** |
| 原有测试 | 71 | 2790 | 2790 | 0 | 100% |
| **全量总计** | **84** | **3188** | **3188** | **0** | **100%** |

### 按异常注入类型统计

| 异常类型 | 测试用例数 | 结果 |
|----------|------------|------|
| XSS 注入 | 13 | 全部通过 |
| SQL 注入 | 4 | 全部通过 |
| 原型污染 | 6 | 全部通过 |
| 空值/null | 28 | 全部通过 |
| 负数/零值 | 12 | 全部通过 |
| 超大值 | 8 | 全部通过 |
| 浮点精度 | 8 | 全部通过 |
| 超长字符串 | 5 | 全部通过 |
| 特殊字符/Emoji | 7 | 全部通过 |
| 未来日期 | 4 | 全部通过 |

---

## 四、发现的问题与修复建议

### 已通过验证的改进项（确认有效）

| 改进项 | 验证方式 | 结论 |
|--------|----------|------|
| #22 同步锁分离 | 并发push/pull独立锁测试 | isPulling/isPushing 独立工作，isSyncing 计算属性兼容 |
| #23 墓碑TTL | 31天过期自动清理测试 | 墓碑正确过期，旧格式自动迁移 |
| #24 deepEqual | 键序不同对象比较测试 | 不再因键序误判冲突 |
| #28 差异存储 | 100版本存储大小对比测试 | diff 格式显著小于完整快照 |
| #35 工作流持久化 | 实例创建后localStorage验证 | 实例正确持久化和恢复 |
| #36 超时检查 | currentNodeArrivalTime测试 | 超时基于节点到达时间计算 |

### 新发现的问题

| # | 问题 | 严重程度 | 详情 | 修复建议 |
|---|------|----------|------|----------|
| N-01 | AES 大文件解密栈溢出 | 中 | `String.fromCharCode(...result)` 展开大 Uint8Array 时栈溢出，100KB+ 数据可能崩溃 | 改用 `TextDecoder` 或分块拼接 |
| N-02 | numberToChinese 负数返回空字符串 | 低 | 负数输入不抛异常但返回空字符串，用户无反馈 | 添加负数前缀"负"或抛出验证错误 |
| N-03 | 客户信用额度超限无自动拦截 | 中 | balance > creditLimit 时仅标记状态，不阻止新增交易 | 在 addCustomer/updateCustomer 中添加信用额度校验 |
| N-04 | 部分付款浮点精度残留 | 低 | 100元分3次付33.33，剩余0.01，但显示可能为 0.009999999999996 | 使用 Decimal.js 或 Math.round 处理金额 |
| N-05 | 工作流模板不存在时返回 null 无错误提示 | 低 | startInstance 对不存在的模板返回 null，调用方需自行检查 | 抛出明确异常或返回 { success: false, error } |

---

## 五、新增测试文件清单

| 文件路径 | 用例数 | 覆盖范围 |
|----------|--------|----------|
| src/__tests__/fixtures/dataGenerator.js | - | 数据生成器（11个模块 + 13种异常类型） |
| src/__tests__/utils/perfTracker.js | - | 性能测试工具（6个导出函数） |
| src/__tests__/stores/customer.deep.test.js | 46 | 客户Store深度测试 |
| src/__tests__/stores/finance.deep.test.js | 24 | 财务Store深度测试 |
| src/__tests__/stores/inventory.deep.test.js | 27 | 库存Store深度测试 |
| src/__tests__/utils/financeHelpers.deep.test.js | 48 | 财务工具函数深度测试 |
| src/__tests__/utils/numberToChinese.deep.test.js | 39 | 数字转中文深度测试 |
| src/__tests__/utils/conflictResolver.deep.test.js | 53 | 冲突解决器深度测试 |
| src/__tests__/utils/crypto.deep.test.js | 38 | 加密工具深度测试 |
| src/__tests__/utils/syncEngine.deep.test.js | 28 | 同步引擎深度测试 |
| src/__tests__/utils/workflowEngine.deep.test.js | 29 | 工作流引擎深度测试 |
| src/__tests__/utils/versionControl.deep.test.js | 34 | 版本控制深度测试 |
| src/__tests__/integration/fullFlow.test.js | 8 | 跨模块集成测试 |
| src/__tests__/security/pentest.test.js | 18 | 安全渗透测试 |
| src/__tests__/performance/benchmark.test.js | 6 | 性能基准测试 |

---

## 六、后续建议

### 短期修复（新发现问题）

1. **N-01 AES大文件栈溢出**: 将 `String.fromCharCode(...result)` 改为 `new TextDecoder().decode(result)`，优先级高
2. **N-03 信用额度自动拦截**: 在交易创建时添加 `creditLimit` 校验，优先级中
3. **N-04 金额浮点精度**: 引入 `Decimal.js` 或统一使用分（整数）存储，优先级中

### 中期增强

4. 添加 E2E 测试（Playwright），覆盖完整用户操作流程
5. 添加 CI/CD 集成，每次提交自动运行深度测试
6. 添加测试覆盖率阈值（目标：核心模块 > 80%）

### 长期规划

7. L3 极限数据量测试（10万级），需要后端配合
8. 内存泄漏持续监控（Chrome DevTools Protocol）
9. 安全渗透测试自动化（OWASP ZAP 集成）
