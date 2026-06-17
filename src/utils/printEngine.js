/**
 * 打印模板引擎
 * 支持：模板管理、变量替换、打印、导出PDF
 */

const TEMPLATES_KEY = 'gj_erp_printTemplates'

function loadTemplates() {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.warn('[printEngine] load templates failed:', e)
  }
  return null
}

function saveTemplates(templates) {
  try {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates))
  } catch (e) {
    console.error('[printEngine] save templates failed:', e)
  }
}

class PrintEngine {
  constructor() {
    this.templates = loadTemplates() || this.getDefaultTemplates()
    if (!loadTemplates()) {
      saveTemplates(this.templates)
    }
  }

  /* 获取默认模板 */
  getDefaultTemplates() {
    return [
      {
        id: 'tpl_quotation',
        name: '报价单',
        type: 'quotation',
        pageSize: 'A4',
        orientation: 'portrait',
        margins: { top: 15, right: 15, bottom: 15, left: 15 },
        header: '{{companyName}}',
        footer: '第 {{pageNumber}} 页 / 共 {{totalPages}} 页',
        content: `
<div style="text-align:center;margin-bottom:20px">
  <h1 style="font-size:24px;margin:0">{{title}}</h1>
  <p style="color:#888;margin:5px 0">编号: {{orderNo}} | 日期: {{date}}</p>
</div>
<table style="width:100%;border-collapse:collapse;margin:15px 0">
  <thead>
    <tr style="background:#f5f5f5">
      <th style="border:1px solid #ccc;padding:8px">序号</th>
      <th style="border:1px solid #ccc;padding:8px">物料名称</th>
      <th style="border:1px solid #ccc;padding:8px">规格</th>
      <th style="border:1px solid #ccc;padding:8px">数量</th>
      <th style="border:1px solid #ccc;padding:8px">单价</th>
      <th style="border:1px solid #ccc;padding:8px">金额</th>
    </tr>
  </thead>
  <tbody>
    {{#items}}
    <tr>
      <td style="border:1px solid #ccc;padding:8px">{{index}}</td>
      <td style="border:1px solid #ccc;padding:8px">{{name}}</td>
      <td style="border:1px solid #ccc;padding:8px">{{spec}}</td>
      <td style="border:1px solid #ccc;padding:8px">{{quantity}}</td>
      <td style="border:1px solid #ccc;padding:8px">{{unitPrice}}</td>
      <td style="border:1px solid #ccc;padding:8px">{{amount}}</td>
    </tr>
    {{/items}}
  </tbody>
</table>
<div style="text-align:right;font-size:16px;font-weight:bold">合计: {{totalAmount}}</div>
<div style="margin-top:30px;color:#888">备注: {{notes}}</div>
        `.trim(),
        createDate: '2026-01-01'
      },
      {
        id: 'tpl_contract',
        name: '合同',
        type: 'contract',
        pageSize: 'A4',
        orientation: 'portrait',
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
        header: '{{companyName}}',
        footer: '第 {{pageNumber}} 页',
        content: `
<div style="text-align:center;margin-bottom:20px">
  <h1 style="font-size:22px;margin:0">{{title}}</h1>
  <p style="color:#888">合同编号: {{contractNo}}</p>
</div>
<div style="margin:15px 0">
  <p><strong>甲方:</strong> {{partyA}}</p>
  <p><strong>乙方:</strong> {{partyB}}</p>
  <p><strong>签订日期:</strong> {{signDate}}</p>
  <p><strong>合同金额:</strong> {{totalAmount}}</p>
</div>
<div style="margin:15px 0;line-height:1.8">{{content}}</div>
        `.trim(),
        createDate: '2026-01-01'
      },
      {
        id: 'tpl_outbound',
        name: '出库单',
        type: 'outbound',
        pageSize: 'A4',
        orientation: 'portrait',
        margins: { top: 10, right: 10, bottom: 10, left: 10 },
        header: '',
        footer: '',
        content: `
<div style="text-align:center;margin-bottom:15px">
  <h2 style="margin:0">出库单</h2>
  <p style="color:#888;font-size:12px">单号: {{orderNo}} | 日期: {{date}} | 类型: {{type}}</p>
</div>
<table style="width:100%;border-collapse:collapse">
  <thead>
    <tr style="background:#f5f5f5">
      <th style="border:1px solid #ccc;padding:6px">编号</th>
      <th style="border:1px solid #ccc;padding:6px">物料名称</th>
      <th style="border:1px solid #ccc;padding:6px">规格</th>
      <th style="border:1px solid #ccc;padding:6px">数量</th>
      <th style="border:1px solid #ccc;padding:6px">单位</th>
      <th style="border:1px solid #ccc;padding:6px">仓位</th>
    </tr>
  </thead>
  <tbody>
    {{#items}}
    <tr>
      <td style="border:1px solid #ccc;padding:6px">{{code}}</td>
      <td style="border:1px solid #ccc;padding:6px">{{name}}</td>
      <td style="border:1px solid #ccc;padding:6px">{{spec}}</td>
      <td style="border:1px solid #ccc;padding:6px">{{quantity}}</td>
      <td style="border:1px solid #ccc;padding:6px">{{unit}}</td>
      <td style="border:1px solid #ccc;padding:6px">{{location}}</td>
    </tr>
    {{/items}}
  </tbody>
</table>
<div style="margin-top:20px;font-size:12px">备注: {{notes}}</div>
<div style="margin-top:30px;display:flex;justify-content:space-around">
  <span>制单:________</span><span>审核:________</span><span>领料:________</span>
</div>
        `.trim(),
        createDate: '2026-01-01'
      },
      {
        id: 'tpl_delivery',
        name: '送货单',
        type: 'delivery',
        pageSize: 'A4',
        orientation: 'portrait',
        margins: { top: 10, right: 10, bottom: 10, left: 10 },
        header: '{{companyName}}',
        footer: '',
        content: `
<div style="text-align:center;margin-bottom:15px">
  <h2 style="margin:0">送货单</h2>
  <p style="color:#888;font-size:12px">单号: {{orderNo}} | 日期: {{date}}</p>
</div>
<div style="margin:10px 0;font-size:13px">
  <p><strong>客户:</strong> {{customerName}}</p>
  <p><strong>地址:</strong> {{address}}</p>
  <p><strong>联系人:</strong> {{contact}}</p>
</div>
<table style="width:100%;border-collapse:collapse">
  <thead>
    <tr style="background:#f5f5f5">
      <th style="border:1px solid #ccc;padding:6px">物料名称</th>
      <th style="border:1px solid #ccc;padding:6px">规格</th>
      <th style="border:1px solid #ccc;padding:6px">数量</th>
      <th style="border:1px solid #ccc;padding:6px">备注</th>
    </tr>
  </thead>
  <tbody>
    {{#items}}
    <tr>
      <td style="border:1px solid #ccc;padding:6px">{{name}}</td>
      <td style="border:1px solid #ccc;padding:6px">{{spec}}</td>
      <td style="border:1px solid #ccc;padding:6px">{{quantity}}</td>
      <td style="border:1px solid #ccc;padding:6px">{{remark}}</td>
    </tr>
    {{/items}}
  </tbody>
</table>
<div style="margin-top:30px;display:flex;justify-content:space-around;font-size:13px">
  <span>送货人:________</span><span>收货人:________</span><span>日期:________</span>
</div>
        `.trim(),
        createDate: '2026-01-01'
      },
      {
        id: 'tpl_statement',
        name: '对账单',
        type: 'statement',
        pageSize: 'A4',
        orientation: 'portrait',
        margins: { top: 15, right: 15, bottom: 15, left: 15 },
        header: '{{companyName}}',
        footer: '第 {{pageNumber}} 页',
        content: `
<div style="text-align:center;margin-bottom:20px">
  <h2 style="margin:0">对账单</h2>
  <p style="color:#888">客户: {{customerName}} | 对账期间: {{periodStart}} ~ {{periodEnd}}</p>
</div>
<table style="width:100%;border-collapse:collapse">
  <thead>
    <tr style="background:#f5f5f5">
      <th style="border:1px solid #ccc;padding:6px">日期</th>
      <th style="border:1px solid #ccc;padding:6px">单号</th>
      <th style="border:1px solid #ccc;padding:6px">摘要</th>
      <th style="border:1px solid #ccc;padding:6px">应收</th>
      <th style="border:1px solid #ccc;padding:6px">已收</th>
      <th style="border:1px solid #ccc;padding:6px">余额</th>
    </tr>
  </thead>
  <tbody>
    {{#items}}
    <tr>
      <td style="border:1px solid #ccc;padding:6px">{{date}}</td>
      <td style="border:1px solid #ccc;padding:6px">{{orderNo}}</td>
      <td style="border:1px solid #ccc;padding:6px">{{summary}}</td>
      <td style="border:1px solid #ccc;padding:6px">{{debit}}</td>
      <td style="border:1px solid #ccc;padding:6px">{{credit}}</td>
      <td style="border:1px solid #ccc;padding:6px">{{balance}}</td>
    </tr>
    {{/items}}
  </tbody>
</table>
<div style="text-align:right;margin-top:15px;font-size:16px;font-weight:bold">
  期末余额: {{totalBalance}}
</div>
        `.trim(),
        createDate: '2026-01-01'
      },
      {
        id: 'tpl_purchase',
        name: '采购单',
        type: 'purchase',
        pageSize: 'A4',
        orientation: 'portrait',
        margins: { top: 15, right: 15, bottom: 15, left: 15 },
        header: '{{companyName}}',
        footer: '',
        content: `
<div style="text-align:center;margin-bottom:20px">
  <h2 style="margin:0">采购单</h2>
  <p style="color:#888">单号: {{orderNo}} | 日期: {{date}}</p>
</div>
<div style="margin:10px 0;font-size:13px">
  <p><strong>供应商:</strong> {{supplierName}}</p>
  <p><strong>交货日期:</strong> {{deliveryDate}}</p>
</div>
<table style="width:100%;border-collapse:collapse">
  <thead>
    <tr style="background:#f5f5f5">
      <th style="border:1px solid #ccc;padding:6px">物料名称</th>
      <th style="border:1px solid #ccc;padding:6px">规格</th>
      <th style="border:1px solid #ccc;padding:6px">数量</th>
      <th style="border:1px solid #ccc;padding:6px">单价</th>
      <th style="border:1px solid #ccc;padding:6px">金额</th>
    </tr>
  </thead>
  <tbody>
    {{#items}}
    <tr>
      <td style="border:1px solid #ccc;padding:6px">{{name}}</td>
      <td style="border:1px solid #ccc;padding:6px">{{spec}}</td>
      <td style="border:1px solid #ccc;padding:6px">{{quantity}}</td>
      <td style="border:1px solid #ccc;padding:6px">{{unitPrice}}</td>
      <td style="border:1px solid #ccc;padding:6px">{{amount}}</td>
    </tr>
    {{/items}}
  </tbody>
</table>
<div style="text-align:right;margin-top:15px;font-size:16px;font-weight:bold">合计: {{totalAmount}}</div>
        `.trim(),
        createDate: '2026-01-01'
      },
      {
        id: 'tpl_transfer',
        name: '调拨单',
        type: 'transfer',
        pageSize: 'A4',
        orientation: 'portrait',
        margins: { top: 10, right: 10, bottom: 10, left: 10 },
        header: '',
        footer: '',
        content: `
<div style="text-align:center;margin-bottom:15px">
  <h2 style="margin:0">调拨单</h2>
  <p style="color:#888;font-size:12px">单号: {{orderNo}} | 类型: {{type}}</p>
</div>
<div style="margin:10px 0;font-size:13px">
  <p><strong>调出仓库:</strong> {{fromWarehouse}}</p>
  <p><strong>调入仓库:</strong> {{toWarehouse}}</p>
</div>
<table style="width:100%;border-collapse:collapse">
  <thead>
    <tr style="background:#f5f5f5">
      <th style="border:1px solid #ccc;padding:6px">编号</th>
      <th style="border:1px solid #ccc;padding:6px">物料名称</th>
      <th style="border:1px solid #ccc;padding:6px">规格</th>
      <th style="border:1px solid #ccc;padding:6px">数量</th>
      <th style="border:1px solid #ccc;padding:6px">单价</th>
      <th style="border:1px solid #ccc;padding:6px">金额</th>
    </tr>
  </thead>
  <tbody>
    {{#items}}
    <tr>
      <td style="border:1px solid #ccc;padding:6px">{{code}}</td>
      <td style="border:1px solid #ccc;padding:6px">{{name}}</td>
      <td style="border:1px solid #ccc;padding:6px">{{spec}}</td>
      <td style="border:1px solid #ccc;padding:6px">{{quantity}}</td>
      <td style="border:1px solid #ccc;padding:6px">{{unitPrice}}</td>
      <td style="border:1px solid #ccc;padding:6px">{{amount}}</td>
    </tr>
    {{/items}}
  </tbody>
</table>
<div style="text-align:right;margin-top:10px;font-weight:bold">合计: {{totalAmount}}</div>
<div style="margin-top:30px;display:flex;justify-content:space-around;font-size:13px">
  <span>制单:________</span><span>审批:________</span><span>收货:________</span>
</div>
        `.trim(),
        createDate: '2026-01-01'
      }
    ]
  }

  /* 获取所有模板 */
  getTemplates() {
    return this.templates
  }

  /* 根据ID获取模板 */
  getTemplate(templateId) {
    return this.templates.find((t) => t.id === templateId) || null
  }

  /* 根据类型获取模板 */
  getTemplateByType(type) {
    return this.templates.find((t) => t.type === type) || null
  }

  /* 保存模板 */
  saveTemplate(template) {
    const idx = this.templates.findIndex((t) => t.id === template.id)
    if (idx !== -1) {
      this.templates[idx] = { ...this.templates[idx], ...template }
    } else {
      this.templates.push(template)
    }
    saveTemplates(this.templates)
    return template
  }

  /* 删除模板 */
  deleteTemplate(templateId) {
    this.templates = this.templates.filter((t) => t.id !== templateId)
    saveTemplates(this.templates)
  }

  /* HTML实体转义，防止XSS注入 */
  _escapeHtml(str) {
    if (!str) return ''
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  /* 渲染模板 - 替换变量 */
  render(templateId, data) {
    const template = this.getTemplate(templateId)
    if (!template) return ''

    let html = template.content

    /* 处理循环块 {{#items}}...{{/items}} */
    const loopRegex = /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g
    html = html.replace(loopRegex, (match, key, inner) => {
      const items = data[key]
      if (!Array.isArray(items)) return ''
      return items
        .map((item, idx) => {
          let row = inner
          /* 替换循环内的变量，对值进行HTML转义防止XSS */
          for (const [k, v] of Object.entries(item)) {
            row = row.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), this._escapeHtml(v))
          }
          row = row.replace(/\{\{index\}\}/g, idx + 1)
          return row
        })
        .join('')
    })

    /* 替换简单变量 {{variable}}，对值进行HTML转义防止XSS */
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value)) continue
      html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), this._escapeHtml(value))
    }

    /* 清除未替换的变量 */
    html = html.replace(/\{\{(\w+)\}\}/g, '')

    return html
  }

  /* 打印 */
  print(html) {
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <html>
      <head><title>打印</title>
        <style>
          body { font-family: -apple-system, 'Microsoft YaHei', sans-serif; padding: 20px; color: #333; }
          @page { margin: 10mm; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>${html}</body>
      </html>
    `)
    printWindow.document.close()
    setTimeout(() => {
      printWindow.print()
    }, 300)
  }

  /* 导出PDF（简化版，使用打印对话框） */
  async exportPDF(html, filename) {
    /* 由于html2canvas + jspdf需要额外依赖，这里使用打印方式替代 */
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <html>
      <head><title>${filename || '导出PDF'}</title>
        <style>
          body { font-family: -apple-system, 'Microsoft YaHei', sans-serif; padding: 20px; color: #333; }
          @page { margin: 10mm; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>${html}</body>
      </html>
    `)
    printWindow.document.close()
    setTimeout(() => {
      printWindow.print()
    }, 300)
  }

  /* 获取模板可用变量列表 */
  getVariablesByType(type) {
    const varMap = {
      quotation: [
        'title',
        'orderNo',
        'date',
        'companyName',
        'customerName',
        'totalAmount',
        'notes',
        'items[name,spec,quantity,unitPrice,amount]'
      ],
      contract: ['title', 'contractNo', 'partyA', 'partyB', 'signDate', 'totalAmount', 'content', 'companyName'],
      outbound: ['orderNo', 'date', 'type', 'warehouse', 'notes', 'items[code,name,spec,quantity,unit,location]'],
      delivery: [
        'orderNo',
        'date',
        'companyName',
        'customerName',
        'address',
        'contact',
        'items[name,spec,quantity,remark]'
      ],
      statement: [
        'companyName',
        'customerName',
        'periodStart',
        'periodEnd',
        'totalBalance',
        'items[date,orderNo,summary,debit,credit,balance]'
      ],
      purchase: [
        'orderNo',
        'date',
        'companyName',
        'supplierName',
        'deliveryDate',
        'totalAmount',
        'items[name,spec,quantity,unitPrice,amount]'
      ],
      transfer: [
        'orderNo',
        'type',
        'fromWarehouse',
        'toWarehouse',
        'totalAmount',
        'items[code,name,spec,quantity,unitPrice,amount]'
      ]
    }
    return varMap[type] || []
  }
}

/* 单例 */
let _instance = null
export function getPrintEngine() {
  if (!_instance) {
    _instance = new PrintEngine()
  }
  return _instance
}

export { PrintEngine }
export default PrintEngine
