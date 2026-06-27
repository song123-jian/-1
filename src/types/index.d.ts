/**
 * dpERP 核心类型定义
 */

/* ===== 基础工具类型 ===== */

/** 可空类型 */
type Nullable<T> = T | null | undefined

/** 记录ID */
type RecordId = string

/** ISO 日期时间字符串 */
type ISODateTime = string

/* ===== 审计字段 ===== */
interface AuditFields {
  id: RecordId
  createdAt: ISODateTime
  updatedAt: ISODateTime
  createdBy?: string
  updatedBy?: string
}

/* ===== 业务实体 ===== */

/** 客户 */
interface Customer extends AuditFields {
  name: string
  customerNo?: string
  shortName?: string
  contactName?: string
  phone?: string
  email?: string
  region?: string
  level?: 'A' | 'B' | 'C'
  creditLimit?: number
  balance?: number
  address?: string
  department?: string
  position?: string
  decisionAuthority?: string
  coreConcerns?: string
  status?: string
}

/** 报价 */
interface Quotation extends AuditFields {
  quoteNo: string
  customerId: RecordId
  customerName: string
  total: number
  status: string
  profitMargin?: number
  validUntil?: ISODateTime
  items?: QuotationItem[]
}

interface QuotationItem {
  id?: RecordId
  productCode: string
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  cost?: number
}

/** 合同 */
interface Contract extends AuditFields {
  contractNo: string
  quotationId?: RecordId
  customerId: RecordId
  customerName: string
  partyAId?: RecordId
  amount: number
  status: string
  signDate?: ISODateTime
  deliveryDate?: ISODateTime
  terms?: string
}

/** 库存物料 */
interface InventoryItem extends AuditFields {
  code: string
  name: string
  category?: string
  quantity: number
  safetyStock?: number
  maxStock?: number
  warehouse?: string
  location?: string
  unitCost: number
  grade?: string
  color?: string
  brand?: string
}

/** 入库单 */
interface InboundOrder extends AuditFields {
  inboundNo: string
  items: InboundOrderItem[]
  status: string
  confirmedAt?: ISODateTime
  totalCost?: number
}

interface InboundOrderItem {
  itemCode: string
  itemName: string
  quantity: number
  unitCost: number
  warehouse?: string
  location?: string
}

/** 出库单 */
interface OutboundOrder extends AuditFields {
  outboundNo: string
  items: OutboundOrderItem[]
  status: string
  confirmedAt?: ISODateTime
  customerId?: RecordId
}

interface OutboundOrderItem {
  itemCode: string
  itemName: string
  quantity: number
  warehouse?: string
  location?: string
}

/** 送货单 */
interface Delivery extends AuditFields {
  deliveryNo: string
  customerId: RecordId
  customerName: string
  items: DeliveryItem[]
  status: string
  deliveredAt?: ISODateTime
}

interface DeliveryItem {
  itemCode: string
  itemName: string
  quantity: number
  unitPrice?: number
}

/** 回款记录 */
interface Collection extends AuditFields {
  collectionNo: string
  customerId: RecordId
  customerName: string
  amount: number
  collectedAt: ISODateTime
  paymentMethod?: string
}

/** 对账单 */
interface Statement extends AuditFields {
  statementNo: string
  customerId: RecordId
  customerName: string
  amount: number
  status: string
  periodStart: ISODateTime
  periodEnd: ISODateTime
}

/** 供应商 */
interface Supplier extends AuditFields {
  name: string
  supplierCode?: string
  shortName?: string
  contact?: string
  phone?: string
  email?: string
  rating?: 'A' | 'B' | 'C'
  status?: string
}

/** 采购单 */
interface PurchaseOrder extends AuditFields {
  purchaseNo: string
  supplierId: RecordId
  supplierName: string
  items: PurchaseOrderItem[]
  totalAmount: number
  status: string
  orderDate: ISODateTime
}

interface PurchaseOrderItem {
  itemCode: string
  itemName: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

/** 生产工单 */
interface ProductionOrder extends AuditFields {
  orderNo: string
  productCode: string
  productName: string
  quantity: number
  status: string
  bomId?: RecordId
  startDate?: ISODateTime
  endDate?: ISODateTime
}

/** BOM 节点 */
interface BomNode {
  id: RecordId
  code: string
  name: string
  quantity: number
  unit?: string
  children?: BomNode[]
}

/* ===== 系统类型 ===== */

/** 用户角色 */
type UserRole = '管理员' | '总经理' | '销售主管' | '销售员' | '仓库主管' | '仓管员' | '财务' | '查看者'

/** 权限模块 */
interface PermissionModule {
  key: string
  label: string
  perms: string[]
}

/** 权限矩阵: { "角色.模块.权限": boolean } */
interface PermissionMatrix {
  [key: string]: boolean
}

/** 操作结果 */
interface OperationResult<T = any> {
  success: boolean
  data?: T
  error?: string
  timestamp: number
}

/** 错误信息 */
interface ErrorInfo {
  type: string
  code: string
  message: string
  originalMessage?: string
  errorCode?: string | null
  suggestion: string
  recoverable: boolean
}

/** 数据变更事件 */
interface DataChangeEvent {
  id?: RecordId
  ids?: RecordId[]
  data?: any
  oldData?: any
  changes?: { field: string; oldValue: any; newValue: any }[]
  user?: string
}

/* ===== API/Sync 类型 ===== */

/** 查询过滤器 */
interface QueryFilter {
  field: string
  value: any
  operator?: 'eq' | 'neq' | 'contains' | 'gt' | 'gte' | 'lt' | 'lte' | 'in'
}

/** 查询选项 */
interface QueryOptions {
  id?: RecordId
  filters?: QueryFilter[]
  search?: string
  orderBy?: { field: string; ascending: boolean }
  limit?: number
  useCache?: boolean
  validate?: boolean
  user?: string
  checkPermission?: boolean
  recordVersion?: boolean
  softDelete?: boolean
  onProgress?: (current: number, total: number, imported: number, skipped: number) => void
}

/** 同步状态 */
type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error'

/** 同步资源 */
interface SyncResource {
  name: string
  store: any
  dataKey: string
}