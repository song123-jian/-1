export function buildSmartKeyValueTemplate(lines) {
  if (!Array.isArray(lines) || lines.length === 0) return ''
  return lines
    .map((line) => {
      const label = typeof line === 'string' ? line : line?.label || line?.key || ''
      return label ? `${label}: ` : ''
    })
    .filter(Boolean)
    .join('\n')
}

export function buildSmartCsvTemplate(headers) {
  if (!Array.isArray(headers) || headers.length === 0) return ''
  return headers
    .map((header) => (typeof header === 'string' ? header : header?.label || header?.key || ''))
    .filter(Boolean)
    .join(',')
}

export function buildSmartTemplate({ tableHeaders = [], fields = [] } = {}) {
  const sections = []
  const tableSection = buildSmartCsvTemplate(tableHeaders)
  const fieldSection = buildSmartKeyValueTemplate(fields)
  if (tableSection) sections.push(tableSection)
  if (fieldSection) sections.push(fieldSection)
  return sections.join('\n\n')
}

export function downloadSmartTemplateFile(filename, content) {
  const safeName = filename || 'smart-recognize-template.txt'
  const text = String(content || '')
  const isCsv = /\.csv$/i.test(safeName)
  const blob = new Blob([isCsv ? '\ufeff' : '', text], {
    type: isCsv ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8'
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = safeName
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
