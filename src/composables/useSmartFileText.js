const TEXT_EXTENSIONS = new Set(['txt', 'csv', 'tsv', 'json', 'log', 'md'])
const SHEET_EXTENSIONS = new Set(['xlsx', 'xls'])

function getExt(fileName = '') {
  const parts = String(fileName).toLowerCase().split('.')
  return parts.length > 1 ? parts.at(-1) : ''
}

export async function extractSmartFileText(file) {
  if (!file) return ''

  const ext = getExt(file.name)

  if (TEXT_EXTENSIONS.has(ext)) {
    return await file.text()
  }

  if (SHEET_EXTENSIONS.has(ext)) {
    const XLSX = await import('xlsx')
    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer, { type: 'array' })
    const firstSheetName = wb.SheetNames?.[0]
    if (!firstSheetName) return ''
    const sheet = wb.Sheets[firstSheetName]
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
    return rows
      .map((row) => (Array.isArray(row) ? row.map((cell) => (cell == null ? '' : String(cell).trim())).join('\t') : ''))
      .filter(Boolean)
      .join('\n')
  }

  return ''
}
