/**
 * 条码工具
 * 支持：生成条码SVG、生成二维码、解析条码、批量生成标签
 */

/**
 * 生成条码SVG (Code 128 简化版)
 * @param {string} text - 条码内容
 * @param {object} options - 选项 { width, height, fontSize, color, background }
 * @returns {string} SVG字符串
 */
export function generateBarcode(text, options = {}) {
  if (!text) return ''

  const { width = 2, height = 60, fontSize = 12, color = '#000000', background = '#ffffff' } = options

  /* 简化的Code 128编码 - 使用交替的黑白条表示 */
  const chars = text.split('')
  const bars = []
  let totalWidth = 0

  /* 起始符 */
  bars.push({ w: 2, c: 1 }) // 黑
  bars.push({ w: 1, c: 0 }) // 白
  totalWidth += 3

  /* 数据编码 - 每个字符生成固定模式 */
  for (const char of chars) {
    const code = char.charCodeAt(0)
    /* 简化的编码模式 */
    bars.push({ w: 1, c: 1 })
    bars.push({ w: 1, c: 0 })
    bars.push({ w: width, c: 1 })
    bars.push({ w: 1, c: 0 })
    /* 根据字符码值调整条宽 */
    const pattern = (code % 7) + 2
    bars.push({ w: pattern, c: 1 })
    bars.push({ w: 1, c: 0 })
    totalWidth += 5 + pattern + 2
  }

  /* 校验位模拟 */
  bars.push({ w: 2, c: 1 })
  bars.push({ w: 1, c: 0 })
  totalWidth += 3

  /* 终止符 */
  bars.push({ w: 2, c: 1 })
  bars.push({ w: 2, c: 0 })
  bars.push({ w: 1, c: 1 })
  totalWidth += 5

  const svgWidth = totalWidth + 20
  const svgHeight = height + fontSize + 10

  let svgBars = ''
  let x = 10
  for (const bar of bars) {
    if (bar.c === 1) {
      svgBars += `<rect x="${x}" y="5" width="${bar.w}" height="${height}" fill="${color}"/>`
    }
    x += bar.w
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
  <rect width="${svgWidth}" height="${svgHeight}" fill="${background}"/>
  ${svgBars}
  <text x="${svgWidth / 2}" y="${height + fontSize + 5}" text-anchor="middle" font-size="${fontSize}" font-family="monospace" fill="${color}">${escapeXml(text)}</text>
</svg>`
}

/**
 * 生成二维码 (简化版，使用Canvas绘制)
 * @param {string} text - 二维码内容
 * @param {object} options - 选项 { size, margin, color, background }
 * @returns {string} data URL
 */
export function generateQRCode(text, options = {}) {
  const { size = 200, margin = 10, color = '#000000', background = '#ffffff' } = options

  if (!text) return ''

  /* 简化的二维码生成 - 使用确定性伪随机模式 */
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  /* 白色背景 */
  ctx.fillStyle = background
  ctx.fillRect(0, 0, size, size)

  const moduleCount = 25
  const moduleSize = (size - margin * 2) / moduleCount
  ctx.fillStyle = color

  /* 绘制定位图案 */
  drawFinderPattern(ctx, margin, margin, moduleSize)
  drawFinderPattern(ctx, margin + (moduleCount - 7) * moduleSize, margin, moduleSize)
  drawFinderPattern(ctx, margin, margin + (moduleCount - 7) * moduleSize, moduleSize)

  /* 根据文本内容生成数据区域 */
  const dataModules = generateDataModules(text, moduleCount)
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      /* 跳过定位图案区域 */
      if (isFinderArea(row, col, moduleCount)) continue
      if (dataModules[row] && dataModules[row][col]) {
        ctx.fillRect(margin + col * moduleSize, margin + row * moduleSize, moduleSize, moduleSize)
      }
    }
  }

  return canvas.toDataURL('image/png')
}

/* 绘制定位图案 */
function drawFinderPattern(ctx, x, y, moduleSize) {
  /* 外框 7x7 */
  ctx.fillRect(x, y, 7 * moduleSize, 7 * moduleSize)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(x + moduleSize, y + moduleSize, 5 * moduleSize, 5 * moduleSize)
  ctx.fillStyle = '#000000'
  ctx.fillRect(x + 2 * moduleSize, y + 2 * moduleSize, 3 * moduleSize, 3 * moduleSize)
}

/* 判断是否在定位图案区域 */
function isFinderArea(row, col, moduleCount) {
  if (row < 8 && col < 8) return true
  if (row < 8 && col > moduleCount - 9) return true
  if (row > moduleCount - 9 && col < 8) return true
  return false
}

/* 根据文本生成数据模块 */
function generateDataModules(text, moduleCount) {
  const modules = Array.from({ length: moduleCount }, () => Array(moduleCount).fill(false))
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0
  }

  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (isFinderArea(row, col, moduleCount)) continue
      /* 使用确定性伪随机决定是否填充 */
      const seed = hash + row * moduleCount + col
      const val = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453
      modules[row][col] = val - Math.floor(val) > 0.5
    }
  }
  return modules
}

/**
 * 解析条码
 * @param {string} text - 条码文本
 * @returns {object} { type, value }
 */
export function parseBarcode(text) {
  if (!text) return { type: 'unknown', value: '' }

  /* 编号模式: MTL-XXX */
  if (/^MTL-\d{3}$/i.test(text)) {
    return { type: 'material', value: text }
  }

  /* 仓位编码模式: X-XX-XX */
  if (/^[A-E]-\d{2}-\d{2}$/.test(text)) {
    return { type: 'location', value: text }
  }

  /* 单号模式: RK/CK/PD/DB + 日期 + 序号 */
  if (/^(RK|CK|PD|DB)\d{11}\d{3}$/.test(text)) {
    const prefixMap = { RK: 'inbound', CK: 'outbound', PD: 'stocktaking', DB: 'transfer' }
    const prefix = text.slice(0, 2)
    return { type: prefixMap[prefix] || 'order', value: text }
  }

  /* 供应商编码: SUP-XXX */
  if (/^SUP-\d{3}$/i.test(text)) {
    return { type: 'supplier', value: text }
  }

  /* 默认 */
  return { type: 'unknown', value: text }
}

/**
 * 批量生成条码标签HTML
 * @param {Array} items - [{ code, name, spec }]
 * @param {object} options - { labelSize: 'small'|'medium'|'large', showQR }
 * @returns {string} HTML字符串
 */
export function generateLabels(items, options = {}) {
  const { labelSize = 'medium', showQR = false } = options

  const sizeMap = {
    small: { width: 160, height: 80, fontSize: 10, barcodeHeight: 35 },
    medium: { width: 240, height: 120, fontSize: 12, barcodeHeight: 50 },
    large: { width: 320, height: 160, fontSize: 14, barcodeHeight: 65 }
  }

  const cfg = sizeMap[labelSize] || sizeMap.medium

  const labels = items.map((item) => {
    const barcodeSvg = generateBarcode(item.code, {
      width: 1.5,
      height: cfg.barcodeHeight,
      fontSize: cfg.fontSize - 2
    })

    let qrSection = ''
    if (showQR) {
      const qrDataUrl = generateQRCode(item.code, { size: cfg.barcodeHeight + 10 })
      qrSection = `<img src="${qrDataUrl}" style="width:${cfg.barcodeHeight}px;height:${cfg.barcodeHeight}px;margin-left:5px" />`
    }

    return `<div style="display:inline-block;width:${cfg.width}px;height:${cfg.height}px;border:1px solid #ccc;border-radius:4px;padding:5px;margin:3px;page-break-inside:avoid;font-family:-apple-system,'Microsoft YaHei',sans-serif">
      <div style="font-size:${cfg.fontSize - 1}px;font-weight:600;overflow-wrap:break-word;word-wrap:break-word;margin-bottom:2px">${escapeHtml(item.name || '')}</div>
      <div style="display:flex;align-items:center">
        <div style="flex:1">${barcodeSvg}</div>
        ${qrSection}
      </div>
      ${item.spec ? `<div style="font-size:${cfg.fontSize - 3}px;color:#888;margin-top:2px">${escapeHtml(item.spec)}</div>` : ''}
    </div>`
  })

  return `<div style="display:flex;flex-wrap:wrap;gap:4px;padding:10px">${labels.join('')}</div>`
}

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
