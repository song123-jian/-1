# 冠久ERP v3.0.0 新发现问题修复报告

**修复日期**: 2026-06-15
**测试结果**: 84个测试文件 / 3188个测试用例全部通过 / 零回归

---

## 一、修复项总览

| # | 问题 | 严重程度 | 涉及文件 | 状态 |
|---|------|----------|----------|------|
| N-01 | AES 大文件加密栈溢出 | 高 | src/utils/crypto.js | 已修复 |
| N-02 | numberToChinese 负数返回空字符串 | 中 | src/utils/numberToChinese.js | 已修复 |
| N-03 | 客户信用额度超限无自动拦截 | 高 | src/modules/customer/stores/customer.js | 已修复 |
| N-04 | 部分付款浮点精度残留 | 中 | src/modules/finance/stores/receivable.js | 已修复 |
| N-05 | 工作流模板不存在返回 null 无提示 | 中 | src/utils/workflowEngine.js | 已修复 |

---

## 二、修复详情

### N-01: AES 大文件加密栈溢出

**问题**: `aesEncrypt` 中 `String.fromCharCode(...result)` 使用展开运算符处理大 `Uint8Array`，当数据超过约 100KB 时会导致 JavaScript 调用栈溢出（Maximum call stack size exceeded）。

**修复**: 改为循环拼接字符串，避免展开大数组。

```javascript
// 修复前
return btoa(String.fromCharCode(...result))

// 修复后
let binary = ''
for (let i = 0; i < result.length; i++) {
  binary += String.fromCharCode(result[i])
}
return btoa(binary)
```

**验证**: 加密/解密 1MB 文本测试通过（此前 100KB 即栈溢出）。

---

### N-02: numberToChinese 负数返回空字符串

**问题**: `numberToChinese(-1)` 等负数输入时，`Math.floor(-1) = -1`，`String(-1)` = `"-1"`，循环中 `parseInt('-')` 返回 `NaN`，导致结果为空字符串，用户无任何反馈。

**修复**: 
1. 提取核心逻辑为 `_numberToChinesePositive(n)` 内部函数
2. 在 `numberToChinese` 入口处处理负数：`if (n < 0) return '人民币负' + _numberToChinesePositive(-n)`
3. 统一零值返回为 `'人民币零元整'`

```javascript
// 修复前
export function numberToChinese(n) {
  if (n === 0) return '零元整'  // 缺少"人民币"前缀
  // 负数无处理，直接进入正数逻辑导致错误
  ...
}

// 修复后
export function numberToChinese(n) {
  if (n === 0) return '人民币零元整'
  if (n < 0) return '人民币负' + _numberToChinesePositive(-n)
  return '人民币' + _numberToChinesePositive(n)
}
```

**验证**: 
- `numberToChinese(-1)` → `'人民币负壹元整'`
- `numberToChinese(-100)` → `'人民币负壹佰元整'`
- `numberToChinese(0)` → `'人民币零元整'`（统一前缀）

---

### N-03: 客户信用额度超限无自动拦截

**问题**: `addCustomer` 和 `updateCustomer` 不校验余额是否超过信用额度，允许创建/更新余额远超信用额度的客户记录。

**修复**: 在 `addCustomer` 和 `updateCustomer` 中添加信用额度校验，余额超过信用额度时拒绝操作并返回错误信息。

```javascript
// addCustomer 修复
function addCustomer(data) {
  const balance = parseFloat(data.balance) || 0
  const creditLimit = parseFloat(data.creditLimit) || 0
  if (creditLimit > 0 && balance > creditLimit) {
    return { success: false, error: `余额 ${balance} 超过信用额度 ${creditLimit}，请调整后再添加。` }
  }
  ...
}

// updateCustomer 修复
function updateCustomer(id, updates) {
  const existing = customers.value.find((c) => c.id === id)
  if (existing) {
    const newBalance = parseFloat(updates.balance) ?? parseFloat(existing.balance) ?? 0
    const newCreditLimit = parseFloat(updates.creditLimit) ?? parseFloat(existing.creditLimit) ?? 0
    if (newCreditLimit > 0 && newBalance > newCreditLimit) {
      return { success: false, error: `余额 ${newBalance} 超过信用额度 ${newCreditLimit}，请调整后再更新。` }
    }
  }
  ...
}
```

**设计决策**: `creditLimit = 0` 视为未设置额度，不触发拦截。

**验证**: 
- 余额 150000 / 额度 100000 → 返回 `{ success: false }`
- 余额 100000 / 额度 100000 → 允许（等于额度）
- 余额 1 / 额度 0 → 允许（未设额度）

---

### N-04: 部分付款浮点精度残留

**问题**: 应收单收款和撤销收款时使用直接浮点运算，导致精度问题。例如：100元分3次付33.33，剩余应为0.01，但浮点运算结果为 `0.009999999999996`。

**修复**: 在 `addReceipt` 和 `deleteReceipt` 中使用 `Math.round(x * 100) / 100` 确保金额精确到分。

```javascript
// addReceipt 修复
const newReceived = Math.round(((parseFloat(rv.receivedAmount) || 0) + amount) * 100) / 100
receivables.value[rvIdx].receivedAmount = newReceived
receivables.value[rvIdx].remainingAmount = Math.round(((parseFloat(rv.amount) || 0) - newReceived) * 100) / 100

// deleteReceipt 修复
receivable.receivedAmount = Math.round(((receivable.receivedAmount || 0) - (receipt.amount || 0)) * 100) / 100
receivable.remainingAmount = Math.round(((parseFloat(receivable.amount) || 0) - receivable.receivedAmount) * 100) / 100
```

**验证**: 100元分3次付33.33，剩余精确为0.01；再付0.01后状态变为 completed。

---

### N-05: 工作流模板不存在返回 null 无提示

**问题**: `startInstance` 对不存在的模板返回 `null`，调用方需自行检查返回值，容易遗漏导致后续操作崩溃。

**修复**: 返回 `{ success: false, error: '...' }` 结构化错误对象，与项目中其他 store 方法保持一致。

```javascript
// 修复前
if (!template) {
  console.error(`[WorkflowEngine] 模板不存在: ${templateId}`)
  return null
}

// 修复后
if (!template) {
  console.error(`[WorkflowEngine] 模板不存在: ${templateId}`)
  return { success: false, error: `工作流模板 "${templateId}" 不存在` }
}
```

同时修复了缺少起始节点的情况，同样返回结构化错误。

**验证**: `startInstance('nonexistent', ...)` 返回 `{ success: false, error: '工作流模板 "nonexistent" 不存在' }`。

---

## 三、测试更新

| 测试文件 | 更新内容 |
|----------|----------|
| src/__tests__/stores/customer.deep.test.js | CS-01 信用额度测试改为验证拦截行为 |
| src/__tests__/utils/numberToChinese.deep.test.js | NC-01/NC-02 测试改为验证负数和零值正确输出 |
| src/__tests__/utils/crypto.deep.test.js | CR-02 大文本测试从100KB提升到1MB |
| src/__tests__/utils/workflowEngine.deep.test.js | 模板不存在测试改为验证 `{success:false}` |

---

## 四、全量测试结果

```
Test Files  84 passed (84)
Tests       3188 passed (3188)
Duration    133.70s
```

零回归，所有修复均通过验证。

---

## 五、修改文件清单

| 文件路径 | 修改内容 |
|----------|----------|
| src/utils/crypto.js | aesEncrypt: fromCharCode 展开改为循环拼接 |
| src/utils/numberToChinese.js | 提取 _numberToChinesePositive，支持负数，统一零值前缀 |
| src/modules/customer/stores/customer.js | addCustomer/updateCustomer 添加信用额度校验 |
| src/modules/finance/stores/receivable.js | addReceipt/deleteReceipt 使用 Math.round 避免浮点误差 |
| src/utils/workflowEngine.js | startInstance 返回结构化错误对象 |
| src/__tests__/stores/customer.deep.test.js | 更新信用额度测试 |
| src/__tests__/utils/numberToChinese.deep.test.js | 更新零值和负数测试 |
| src/__tests__/utils/crypto.deep.test.js | 大文本测试提升到1MB |
| src/__tests__/utils/workflowEngine.deep.test.js | 更新模板不存在测试 |
