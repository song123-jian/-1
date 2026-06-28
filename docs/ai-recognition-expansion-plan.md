# AI 内容识别与文件识别扩展方案

## 1. 目标

把现有的 AI 识别能力统一扩展到以下模块：

- 项目追踪
- 合同管理
- 交易管理
- 出库登记
- 生产管理
- 送货管理

统一支持两种入口：

1. 粘贴文本识别
2. 文件导入识别

目标不是做“聊天式 AI”，而是做“可回填表单的结构化识别”。

---

## 2. 现状判断

当前仓库里已经有一条可复用链路：

- `src/components/SmartRecognizePanel.vue`
- `src/composables/useSmartRecognizeBase.js`
- 各模块自己的 `useSmartRecognize.js`

现有问题是：

- 文件上传只读文本，不能真正理解 `xlsx/pdf/docx/image`
- 新模块还在分散写解析逻辑，字段映射不统一
- 项目追踪、出库登记、生产管理、送货管理还没有统一接入体验

---

## 3. 总体方案

### 3.1 统一识别底座

新增一个共享的文件文本提取层，作为所有模块的入口：

- `txt / csv / tsv`：直接读取文本
- `xlsx / xls`：用现有 `xlsx` 库提取首个工作表或合并工作表内容
- `json`：按键值对转文本
- `pdf / docx / image`：作为二期能力，建议接外部解析器或 OCR 服务

### 3.2 统一回填规则

所有模块都遵守同一返回结构：

```js
{
  items: [{ key, label, value, confidence }],
  identifiedCount,
  lowConfCount,
  tableRows?: [],
  tableHeaders?: []
}
```

回填顺序：

1. 先填主表字段
2. 再填明细行
3. 最后让用户确认低置信度项

### 3.3 统一交互

每个新建/编辑弹窗里都放同一套 `SmartRecognizePanel`：

- 文本粘贴
- 文件上传
- 识别结果预览
- 一键确认回填

### 3.4 建议改动文件

优先只动这几类文件：

- `src/composables/useSmartRecognizeBase.js`
- `src/components/SmartRecognizePanel.vue`
- `src/composables/useSmartFileText.js` 这里新增文件内容提取工具
- 各模块自己的 `useSmartRecognize*.js`
- 各页面的表单弹窗组件

其中 `useSmartFileText.js` 负责把文件统一转成文本，`parseFn` 只管做字段解析。

---

## 4. 文件识别策略

### 4.1 一期直接落地

建议先支持这些文件：

- `.txt`
- `.csv`
- `.tsv`
- `.xlsx`
- `.xls`
- `.json`

### 4.2 二期增强

如果业务经常收到扫描件、合同 PDF、Word 单据，建议再加：

- `.pdf`
- `.docx`
- 图片 OCR（`png/jpg/jpeg/webp`）

这一层可以走服务端解析，避免浏览器端体积和兼容性变差。

---

## 5. 模块落地清单

### 5.1 项目追踪

文件入口：

- `src/views/ProjectTracking.vue`

接入点：

- `autoForm`
- `napForm`

建议识别字段：

- 客户
- 主机厂 / OEM
- 车型平台
- 零件名称
- 材料 / 材料牌号
- 颜色
- 阶段
- 报价状态
- 合同状态
- 量产状态
- SOP
- 负责人
- 下次跟进
- 备注

说明：

- 这页是“项目追踪”，更适合做“主数据识别 + 跟进状态识别”
- 风险表单 `riskForm` 可暂不接 AI，放到第二阶段

### 5.2 合同管理

文件入口：

- `src/modules/sales/components/contracts/ContractFormModal.vue`
- `src/modules/sales/components/contracts/useSmartRecognize.js`

当前已具备基础识别，建议补强：

- 文件识别更完整
- 明细表更稳健
- 嵌套字段回填保持统一

建议识别字段：

- 合同类型
- 合同编号
- 签约日期
- 甲方 / 乙方
- 签约地点
- 结算方式
- 有效期
- 代表人
- 联系方式
- 地址
- 产品明细

### 5.3 交易管理

文件入口：

- `src/modules/sales/components/transactions/TransactionFormModal.vue`
- `src/modules/sales/components/transactions/useSmartRecognize.js`

建议识别字段：

- 客户
- 交易类型
- 金额
- 日期
- 备注

补充建议：

- 对来源文本做类型识别时，优先区分 `报价 / 合同 / 回款 / 送货`
- 后续可加“关联单据号”识别

### 5.4 出库登记

文件入口：

- `src/modules/warehouse/components/inventory/OutboundSection.vue`

建议新增：

- `src/modules/warehouse/components/inventory/useOutboundSmartRecognize.js`

建议接入位置：

- 出库登记弹窗
- 编辑出库单弹窗

建议识别字段：

- 出库类型
- 出库日期
- 编号
- 物料编号
- 物料名称
- 牌号
- 颜色
- 数量
- 单价
- 关联单号
- 仓库
- 库位
- 批次号
- 备注

### 5.5 生产管理

文件入口：

- `src/modules/production/views/ProductionManagement.vue`

建议拆成两个识别入口：

1. 工单识别
2. BOM 识别

建议识别字段：

- 工单号
- 产品名称
- 数量
- 优先级
- 计划日期
- 车间
- BOM 编码
- BOM 名称
- 版本
- 类型
- 备注
- 物料明细

说明：

- 工单和 BOM 的字段结构差异很大，不建议共用一套解析函数
- 适合按子模块拆两个 parser

### 5.6 送货管理

文件入口：

- `src/views/Deliveries.vue`

建议识别字段：

- 送货单号
- 客户
- 关联订单号
- 发货日期
- 预计送达
- 运输方式
- 承运单位
- 司机
- 车牌号
- 联系方式
- 收货地址
- 到货日期
- 签收人
- 异常说明
- 明细行

---

## 6. 实施顺序

### Phase 1: 共用能力

1. 抽出文件文本提取工具
2. 统一 `SmartRecognizePanel` 的文件上传表现
3. 保持现有模块不回退

### Phase 2: 先接高频页面

1. 出库登记
2. 送货管理
3. 生产管理

### Phase 3: 补齐业务页

1. 项目追踪
2. 合同管理增强
3. 交易管理增强

### Phase 4: 体验收口

1. 低置信度提示
2. 文件类型提示
3. 识别失败兜底
4. 自动回填前预览

---

## 7. 验收标准

满足以下条件即可认为可上线：

- 每个目标模块都能打开 AI 面板
- 文本粘贴可识别
- 至少 `txt/csv/xlsx` 文件可识别
- 识别结果能回填到主表字段
- 明细行能正常插入
- 低置信度字段允许人工修改
- 编辑模式默认不强制 AI 打断

---

## 8. 风险点

- PDF / 图片 OCR 不建议一次性全做，容易把体积和兼容性拉高
- 项目追踪字段最杂，建议先做“主字段”，不要一口气覆盖所有跟进维度
- 出库、送货、生产三个模块的单据结构相近，但字段名不完全一致，解析器要做语义映射，不要硬写字段名

---

## 9. 推荐结论

建议按“共享底座 + 6 个模块分批接入”的方式推进。

如果你确认这个方向，我下一步就可以直接按这份方案开始改代码，优先把出库登记、送货管理、生产管理先打通。
