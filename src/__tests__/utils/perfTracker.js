/**
 * 性能测试工具
 * 提供耗时测量、内存监控、基准对比等功能
 */

/**
 * 测量同步函数执行耗时
 * @param {Function} fn - 要测量的函数
 * @param {number} iterations - 执行次数
 * @returns {{ avgMs: number, minMs: number, maxMs: number, totalMs: number, iterations: number }}
 */
export function measureSync(fn, iterations = 1) {
  const times = []
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    fn()
    times.push(performance.now() - start)
  }
  return {
    avgMs: times.reduce((a, b) => a + b, 0) / times.length,
    minMs: Math.min(...times),
    maxMs: Math.max(...times),
    totalMs: times.reduce((a, b) => a + b, 0),
    iterations
  }
}

/**
 * 测量异步函数执行耗时
 * @param {Function} fn - 要测量的异步函数
 * @param {number} iterations - 执行次数
 * @returns {Promise<{ avgMs: number, minMs: number, maxMs: number, totalMs: number, iterations: number }>}
 */
export async function measureAsync(fn, iterations = 1) {
  const times = []
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    await fn()
    times.push(performance.now() - start)
  }
  return {
    avgMs: times.reduce((a, b) => a + b, 0) / times.length,
    minMs: Math.min(...times),
    maxMs: Math.max(...times),
    totalMs: times.reduce((a, b) => a + b, 0),
    iterations
  }
}

/**
 * 获取当前内存使用快照（Node.js 环境）
 * @returns {{ heapUsed: number, heapTotal: number, rss: number } | null}
 */
export function getMemorySnapshot() {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const mem = process.memoryUsage()
    return {
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      rss: mem.rss
    }
  }
  return null
}

/**
 * 检测内存泄漏
 * 执行 fn 多轮，比较内存增长
 * @param {Function} fn - 每轮执行的函数
 * @param {number} rounds - 执行轮数
 * @param {number} warmupRounds - 预热轮数（不计入统计）
 * @returns {{ leaked: boolean, growthBytes: number, growthPercent: number, snapshots: Array }}
 */
export function detectMemoryLeak(fn, rounds = 10, warmupRounds = 3) {
  const snapshots = []

  // 预热
  for (let i = 0; i < warmupRounds; i++) {
    fn()
  }

  // 正式测量
  for (let i = 0; i < rounds; i++) {
    fn()
    if (typeof global !== 'undefined' && global.gc) global.gc()
    const snap = getMemorySnapshot()
    if (snap) snapshots.push(snap)
  }

  if (snapshots.length < 2) {
    return { leaked: false, growthBytes: 0, growthPercent: 0, snapshots }
  }

  const first = snapshots[0].heapUsed
  const last = snapshots[snapshots.length - 1].heapUsed
  const growthBytes = last - first
  const growthPercent = (growthBytes / first) * 100

  // 堆内存增长超过 20% 视为可能泄漏
  return {
    leaked: growthPercent > 20,
    growthBytes,
    growthPercent: parseFloat(growthPercent.toFixed(2)),
    snapshots
  }
}

/**
 * 基准测试：验证函数在指定数据量下是否满足性能要求
 * @param {string} name - 测试名称
 * @param {Function} fn - 要测试的函数
 * @param {number} maxMs - 最大允许耗时（毫秒）
 * @param {number} iterations - 执行次数
 * @returns {{ name, passed: boolean, avgMs: number, maxMs: number, detail: Object }}
 */
export function benchmark(name, fn, maxMs, iterations = 3) {
  const result = measureSync(fn, iterations)
  const passed = result.avgMs <= maxMs
  return {
    name,
    passed,
    avgMs: parseFloat(result.avgMs.toFixed(2)),
    maxMs,
    detail: result
  }
}

/**
 * 估算 localStorage 使用量
 * @returns {{ usedBytes: number, estimatedLimit: number, usagePercent: number }}
 */
export function estimateLocalStorageUsage() {
  let totalBytes = 0
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      const value = localStorage.getItem(key)
      // UTF-16 编码，每字符 2 字节
      totalBytes += (key.length + value.length) * 2
    }
  } catch (e) {
    // localStorage 不可用时返回 0
  }
  const estimatedLimit = 5 * 1024 * 1024 // 5MB
  return {
    usedBytes: totalBytes,
    estimatedLimit,
    usagePercent: parseFloat(((totalBytes / estimatedLimit) * 100).toFixed(2))
  }
}

/**
 * 格式化字节数
 */
export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

/**
 * 生成基准测试报告
 * @param {Array<{ name, passed, avgMs, maxMs }>} results
 * @returns {string}
 */
export function generateBenchmarkReport(results) {
  const lines = ['=== 性能基准测试报告 ===', '']
  for (const r of results) {
    const status = r.passed ? 'PASS' : 'FAIL'
    lines.push(`[${status}] ${r.name}: ${r.avgMs}ms (限制: ${r.maxMs}ms)`)
  }
  const passed = results.filter(r => r.passed).length
  lines.push('', `总计: ${passed}/${results.length} 通过`)
  return lines.join('\n')
}
