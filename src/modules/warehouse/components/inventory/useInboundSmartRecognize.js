import { useSmartRecognizeBase, makeItem, parseTableText } from '@/composables/useSmartRecognizeBase'
import { SMART_TEMPLATE_SPECS } from '@/composables/smartRecognizeSpecs'

const FULL_TABLE_HEADERS = [
  { key: 'type', label: '入库类型', type: 'string' },
  { key: 'date', label: '日期', type: 'string' },
  { key: 'supplierCode', label: '供应商编码', type: 'string' },
  { key: 'code', label: '编码', type: 'string' },
  { key: 'name', label: '名称', type: 'string' },
  { key: 'grade', label: '等级', type: 'string' },
  { key: 'color', label: '颜色', type: 'string' },
  { key: 'qty', label: '数量(kg)', type: 'number' },
  { key: 'cost', label: '成本(元/kg)', type: 'number' },
  { key: 'batch', label: '批号', type: 'string' },
  { key: 'notes', label: '备注', type: 'string' }
]

const ITEM_TABLE_HEADERS = [
  { key: 'code', label: '编码', type: 'string' },
  { key: 'name', label: '名称', type: 'string' },
  { key: 'grade', label: '等级', type: 'string' },
  { key: 'color', label: '颜色', type: 'string' },
  { key: 'qty', label: '数量(kg)', type: 'number' },
  { key: 'cost', label: '成本(元/kg)', type: 'number' },
  { key: 'batch', label: '批号', type: 'string' }
]

const TYPE_RULES = [
  { value: 'purchase', label: '采购入库', patterns: [/采购入库/, /采购/, /采购单/, /采购来料/] },
  { value: 'return', label: '退货入库', patterns: [/退货入库/, /退货/, /退货单/] },
  { value: 'transfer', label: '调拨入库', patterns: [/调拨入库/, /调拨单/, /调入/, /调拨/] },
  { value: 'customer_return', label: '客户退货', patterns: [/客户退货/, /客户退货入库/] },
  { value: 'production_return', label: '生产退料', patterns: [/生产退料/, /退料/, /生产退货/] },
  { value: 'surplus', label: '盘盈入库', patterns: [/盘盈入库/, /盘盈/] },
  { value: 'gift', label: '赠品入库', patterns: [/赠品入库/, /赠品/] }
]

function normalizeText(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '')
    .toLowerCase()
}

function looseIncludes(source, target) {
  const a = normalizeText(source)
  const b = normalizeText(target)
  if (!a || !b) return false
  return a === b || a.includes(b) || b.includes(a)
}

function normalizeDate(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  const match = text.match(/((?:19|20)\d{2})\s*[-/.年]?\s*(\d{1,2})\s*[-/.月]?\s*(\d{1,2})\s*日?/)
  if (match) {
    return `${match[1]}-${String(match[2]).padStart(2, '0')}-${String(match[3]).padStart(2, '0')}`
  }
  const isoMatch = text.match(/((?:19|20)\d{2})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (isoMatch) {
    return `${isoMatch[1]}-${String(isoMatch[2]).padStart(2, '0')}-${String(isoMatch[3]).padStart(2, '0')}`
  }
  return text
}

function resolveInboundType(text, inventoryStore) {
  const raw = String(text || '').trim()
  if (!raw) return ''
  const exact = inventoryStore?.INBOUND_TYPES?.find((t) => t.value === raw)
  if (exact) return exact.value

  const matchedRule = TYPE_RULES.find((rule) => rule.patterns.some((re) => re.test(raw)))
  return matchedRule ? matchedRule.value : ''
}

function typeLabel(value, inventoryStore) {
  const found = inventoryStore?.INBOUND_TYPES?.find((t) => t.value === value)
  return found ? found.label : value || ''
}

function findSupplier(raw, inventoryStore) {
  const suppliers = Array.isArray(inventoryStore?.suppliers) ? inventoryStore.suppliers : []
  const target = String(raw || '').trim()
  if (!target) return null
  return (
    suppliers.find((s) => [s.id, s.supplierCode, s.shortName, s.name].some((field) => looseIncludes(field, target))) ||
    null
  )
}

function findWarehouse(raw, inventoryStore) {
  const warehouses = Array.isArray(inventoryStore?.warehouses) ? inventoryStore.warehouses : []
  const target = String(raw || '').trim()
  if (!target) return null
  return warehouses.find((w) => [w.id, w.name, w.warehouseName].some((field) => looseIncludes(field, target))) || null
}

function findLocation(raw, warehouseLocationStore) {
  const locations = Array.isArray(warehouseLocationStore?.locations) ? warehouseLocationStore.locations : []
  const target = String(raw || '').trim()
  if (!target) return null
  return locations.find((loc) => [loc.id, loc.locationCode].some((field) => looseIncludes(field, target))) || null
}

function parseInboundRows(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const fullHeaderIndex = lines.findIndex(
    (line) =>
      line.includes('入库类型') &&
      line.includes('日期') &&
      line.includes('供应商编码') &&
      line.includes('编码') &&
      line.includes('名称') &&
      line.includes('数量')
  )

  if (fullHeaderIndex !== -1) {
    const rows = parseTableText(lines.slice(fullHeaderIndex).join('\n'), FULL_TABLE_HEADERS)
    return rows.map((row) => ({
      type: row.type || '',
      date: row.date || '',
      supplierCode: row.supplierCode || '',
      barcode: row.code || '',
      code: row.code || '',
      name: row.name || '',
      grade: row.grade || '',
      color: row.color || '',
      qty: row.qty || 0,
      cost: row.cost || 0,
      batch: row.batch || '',
      notes: row.notes || ''
    }))
  }

  const itemHeaderIndex = lines.findIndex(
    (line) => line.includes('编码') && line.includes('名称') && line.includes('数量')
  )

  if (itemHeaderIndex !== -1) {
    const rows = parseTableText(lines.slice(itemHeaderIndex).join('\n'), ITEM_TABLE_HEADERS)
    return rows.map((row) => ({
      barcode: row.code || '',
      code: row.code || '',
      name: row.name || '',
      grade: row.grade || '',
      color: row.color || '',
      qty: row.qty || 0,
      cost: row.cost || 0,
      batch: row.batch || ''
    }))
  }

  return []
}

function parseInboundInfo(text, inventoryStore, warehouseLocationStore) {
  const items = []
  let identifiedCount = 0
  let lowConfCount = 0

  function pushItem(item) {
    if (!item) return
    items.push(item)
    identifiedCount += 1
    if (item.confidence < 80) lowConfCount += 1
  }

  const tableRows = parseInboundRows(text)

  const firstRow = tableRows[0] || null
  const typeValue = resolveInboundType(firstRow?.type, inventoryStore) || resolveInboundType(text, inventoryStore) || ''
  if (typeValue) {
    pushItem(makeItem('type', '入库类型', typeLabel(typeValue, inventoryStore), firstRow?.type ? 88 : 82))
  }

  const dateValue = normalizeDate(
    firstRow?.date || text.match(/((?:19|20)\d{2}\s*[-/.年]?\s*\d{1,2}\s*[-/.月]?\s*\d{1,2}\s*日?)/)?.[1] || ''
  )
  if (dateValue) {
    pushItem(makeItem('date', '日期', dateValue, firstRow?.date ? 90 : 78))
  }

  const supplierCodeValue =
    firstRow?.supplierCode ||
    (text.match(/(?:供应商编码|供应商编号|供应商代号|供应商)[:：\s]*([A-Za-z0-9_-]{2,30})/) || [])[1] ||
    ''
  if (supplierCodeValue) {
    const supplier = findSupplier(supplierCodeValue, inventoryStore)
    pushItem(
      makeItem(
        'supplierCode',
        '供应商编码',
        supplier ? supplier.supplierCode || supplierCodeValue : supplierCodeValue,
        supplier ? 90 : 78
      )
    )
    if (supplier) {
      pushItem(makeItem('counterpartyName', '供应商', supplier.shortName || supplier.name, 90))
    }
  }

  const supplierNameMatch = text.match(
    /(?:供应商名称|供应商|供方名称|供方|交易单位|客户|收货单位)[:：\s]*([^\n\r]{2,40})/
  )
  if (supplierNameMatch && !items.some((it) => it.key === 'counterpartyName')) {
    const supplier = findSupplier(supplierNameMatch[1], inventoryStore)
    if (supplier) {
      pushItem(makeItem('counterpartyName', '供应商', supplier.shortName || supplier.name, 82))
      if (!items.some((it) => it.key === 'supplierCode' && it.value)) {
        pushItem(makeItem('supplierCode', '供应商编码', supplier.supplierCode || '', 82))
      }
    } else {
      pushItem(makeItem('counterpartyName', '供应商', supplierNameMatch[1].trim(), 65))
    }
  }

  const warehouseMatch = text.match(/(?:仓库|目标仓库|入库仓库|库房)[:：\s]*([^\n\r]{2,30})/)
  if (warehouseMatch) {
    const warehouse = findWarehouse(warehouseMatch[1], inventoryStore)
    pushItem(
      makeItem(
        'warehouseName',
        '仓库',
        warehouse ? warehouse.name || warehouse.warehouseName || warehouse.id : warehouseMatch[1].trim(),
        warehouse ? 82 : 62
      )
    )
  }

  const locationMatch = text.match(/(?:库位|货位|仓位|位置)[:：\s]*([A-Za-z0-9_-]{2,40})/)
  if (locationMatch) {
    const location = findLocation(locationMatch[1], warehouseLocationStore)
    pushItem(
      makeItem(
        'locationCode',
        '库位',
        location ? location.locationCode || location.id : locationMatch[1].trim(),
        location ? 82 : 60
      )
    )
    if (location && !items.some((it) => it.key === 'warehouseName')) {
      const relatedWarehouse = findWarehouse(location.warehouseId || location.warehouseName, inventoryStore)
      if (relatedWarehouse) {
        pushItem(
          makeItem(
            'warehouseName',
            '仓库',
            relatedWarehouse.name || relatedWarehouse.warehouseName || relatedWarehouse.id,
            80
          )
        )
      }
    }
  }

  const notesMatch = text.match(/(?:备注|说明|摘要|来源|备注信息)[:：\s]*([^\n\r]{2,200})/)
  if (notesMatch) {
    pushItem(makeItem('notes', '备注', notesMatch[1].trim(), 55))
  } else if (firstRow?.notes) {
    pushItem(makeItem('notes', '备注', firstRow.notes, 55))
  }

  const resultRows = tableRows
    .map((row) => ({
      barcode: row.barcode || row.code || '',
      code: row.code || row.barcode || '',
      name: row.name || '',
      grade: row.grade || '',
      color: row.color || '',
      qty: row.qty || 0,
      cost: row.cost || 0,
      batch: row.batch || ''
    }))
    .filter((row) => row.code || row.name || row.barcode)

  const result = { items, identifiedCount: identifiedCount + resultRows.length, lowConfCount }
  if (resultRows.length > 0) {
    result.tableRows = resultRows
    result.tableHeaders = ITEM_TABLE_HEADERS
  }
  return result
}

export function useInboundSmartRecognize(form, inventoryStore, warehouseLocationStore) {
  return useSmartRecognizeBase(
    form,
    (text) => parseInboundInfo(text, inventoryStore, warehouseLocationStore),
    '粘贴入库单文本或表格数据，AI将自动识别并提取关键字段和明细...',
    SMART_TEMPLATE_SPECS.inbound
  )
}
