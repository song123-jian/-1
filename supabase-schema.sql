-- ============================================================
-- dpERP-vue Supabase 数据库初始化脚本
-- 在 Supabase Dashboard → SQL Editor 中执行此脚本
-- 点击 Run（非 Explain）
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================== 1. 客户表 ====================
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  "customerNo" TEXT,
  "fullName" TEXT,
  name TEXT,
  "shortName" TEXT,
  "contactName" TEXT,
  contact TEXT,
  department TEXT,
  position TEXT,
  phone TEXT,
  email TEXT,
  region TEXT,
  level TEXT,
  "decisionAuthority" TEXT,
  "coreConcerns" TEXT,
  "creditLimit" NUMERIC DEFAULT 0,
  balance NUMERIC DEFAULT 0,
  address TEXT,
  status TEXT DEFAULT 'active',
  tags JSONB DEFAULT '[]',
  "createdBy" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- ==================== 2. 报价单表 ====================
CREATE TABLE IF NOT EXISTS quotations (
  id TEXT PRIMARY KEY,
  "quoteNo" TEXT,
  "customerId" TEXT,
  "customerName" TEXT,
  "customerFullName" TEXT,
  "custContact" TEXT,
  "custPhone" TEXT,
  "custEmail" TEXT,
  "senderContact" TEXT,
  "senderCompany" TEXT,
  "senderPhone" TEXT,
  "senderEmail" TEXT,
  date TEXT,
  "expiryDate" TEXT,
  items JSONB DEFAULT '[]',
  subtotal NUMERIC DEFAULT 0,
  "taxRate" NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  "costBasis" NUMERIC DEFAULT 0,
  "profitMargin" NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft',
  currency TEXT DEFAULT 'CNY',
  notes TEXT,
  "termPrice" TEXT,
  "termPayment" TEXT,
  "termDelivery" TEXT,
  "termDeliveryAddr" TEXT,
  "termQuality" TEXT,
  "termPriceAdj" TEXT,
  "termLegal" TEXT,
  "followUps" JSONB DEFAULT '[]',
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- ==================== 3. 合同表 ====================
CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  "contractType" TEXT,
  "partyA" TEXT,
  "partyAId" TEXT,
  "partyB" TEXT,
  "signPlace" TEXT,
  "signDate" TEXT,
  "endDate" TEXT,
  settlement TEXT,
  products JSONB DEFAULT '[]',
  "totalAmount" NUMERIC DEFAULT 0,
  terms TEXT,
  "partyAInfo" JSONB DEFAULT '{}',
  "partyBInfo" JSONB DEFAULT '{}',
  status TEXT DEFAULT 'draft',
  "sourceQuoteId" TEXT,
  notes TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- ==================== 4. 库存表 ====================
CREATE TABLE IF NOT EXISTS inventory (
  id TEXT PRIMARY KEY,
  code TEXT,
  name TEXT,
  category TEXT,
  quantity NUMERIC DEFAULT 0,
  "safetyStock" NUMERIC DEFAULT 0,
  "maxStock" NUMERIC DEFAULT 0,
  warehouse TEXT,
  location TEXT,
  "unitCost" NUMERIC DEFAULT 0,
  "totalValue" NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'normal',
  grade TEXT,
  color TEXT,
  brand TEXT,
  "lastInboundDate" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- ==================== 5. 入库单表 ====================
CREATE TABLE IF NOT EXISTS inbound_orders (
  id TEXT PRIMARY KEY,
  "orderNo" TEXT,
  type TEXT DEFAULT 'inbound',
  "supplierId" TEXT,
  "supplierName" TEXT,
  "warehouseId" TEXT,
  "warehouseName" TEXT,
  items JSONB DEFAULT '[]',
  "totalQuantity" NUMERIC DEFAULT 0,
  "totalAmount" NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  "expectedDate" TEXT,
  "actualDate" TEXT,
  operator TEXT,
  notes TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- ==================== 6. 出库单表 ====================
CREATE TABLE IF NOT EXISTS outbound_orders (
  id TEXT PRIMARY KEY,
  "orderNo" TEXT,
  type TEXT DEFAULT 'outbound',
  "customerId" TEXT,
  "customerName" TEXT,
  "warehouseId" TEXT,
  "warehouseName" TEXT,
  items JSONB DEFAULT '[]',
  "totalQuantity" NUMERIC DEFAULT 0,
  "totalAmount" NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  "expectedDate" TEXT,
  "actualDate" TEXT,
  operator TEXT,
  notes TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- ==================== 7. 交货表 ====================
CREATE TABLE IF NOT EXISTS deliveries (
  id TEXT PRIMARY KEY,
  "deliveryNo" TEXT,
  date TEXT,
  "orderId" TEXT,
  urgency TEXT,
  status TEXT DEFAULT 'pending',
  "customerName" TEXT,
  address TEXT,
  contact TEXT,
  phone TEXT,
  "expectedDate" TEXT,
  "expectedArrivalDate" TEXT,
  "transportMethod" TEXT,
  carrier TEXT,
  driver TEXT,
  "driverPhone" TEXT,
  "plateNo" TEXT,
  "driverMobile" TEXT,
  "trackingNo" TEXT,
  items JSONB DEFAULT '[]',
  "totalQuantity" NUMERIC DEFAULT 0,
  "totalAmount" NUMERIC DEFAULT 0,
  "totalTax" NUMERIC DEFAULT 0,
  "grandTotal" NUMERIC DEFAULT 0,
  "actualDate" TEXT,
  "acceptanceResult" TEXT,
  "acceptNote" TEXT,
  "acceptPerson" TEXT,
  "acceptDate" TEXT,
  "hasException" BOOLEAN DEFAULT false,
  "exceptionType" TEXT,
  "exceptionReason" TEXT,
  "exceptionSolution" TEXT,
  "exceptionResponsible" TEXT,
  reviewer TEXT,
  "financePerson" TEXT,
  creator TEXT,
  "deliverySigner" TEXT,
  "receiverSeal" TEXT,
  "signDate" TEXT,
  remarks TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- ==================== 8. 收款表 ====================
CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  "collectionNo" TEXT,
  "customerId" TEXT,
  "customerName" TEXT,
  "statementId" TEXT,
  date TEXT,
  "dueDate" TEXT,
  amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'CNY',
  method TEXT,
  "referenceNo" TEXT,
  "bankAccount" TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  installments JSONB DEFAULT '[]',
  "createdBy" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- ==================== 9. 对账单表 ====================
CREATE TABLE IF NOT EXISTS statements (
  id TEXT PRIMARY KEY,
  "statementNo" TEXT,
  type TEXT,
  period TEXT,
  "reconDate" TEXT,
  preparer TEXT,
  reviewer TEXT,
  "contactPhone" TEXT,
  "buyerId" TEXT,
  "buyerName" TEXT,
  "buyerAddress" TEXT,
  "buyerContact" TEXT,
  "buyerPhone" TEXT,
  "buyerEmail" TEXT,
  "sellerId" TEXT,
  "sellerName" TEXT,
  "sellerAddress" TEXT,
  "sellerContact" TEXT,
  "sellerPhone" TEXT,
  "sellerEmail" TEXT,
  items JSONB DEFAULT '[]',
  subtotal NUMERIC DEFAULT 0,
  "taxRate" NUMERIC DEFAULT 0,
  "taxAmount" NUMERIC DEFAULT 0,
  "totalAmount" NUMERIC DEFAULT 0,
  "totalChinese" TEXT,
  "paidAmount" NUMERIC DEFAULT 0,
  balance NUMERIC DEFAULT 0,
  "paymentMethod" TEXT,
  "paymentTerm" TEXT,
  "bankName" TEXT,
  "bankAccount" TEXT,
  "bankHolder" TEXT,
  "buyerSign" TEXT,
  "buyerSignDate" TEXT,
  "sellerSign" TEXT,
  "sellerSignDate" TEXT,
  status TEXT DEFAULT 'draft',
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- ==================== 10. 供应商表 ====================
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  code TEXT,
  name TEXT,
  "shortName" TEXT,
  category TEXT,
  contact TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  "bankName" TEXT,
  "bankAccount" TEXT,
  qualification TEXT,
  "qualificationExpiry" TEXT,
  rating NUMERIC DEFAULT 0,
  "deliveryScore" NUMERIC DEFAULT 0,
  "qualityScore" NUMERIC DEFAULT 0,
  "priceScore" NUMERIC DEFAULT 0,
  "serviceScore" NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active',
  "createDate" TEXT,
  notes TEXT
);

-- ==================== 11. 审批规则表 ====================
CREATE TABLE IF NOT EXISTS approval_rules (
  id TEXT PRIMARY KEY,
  name TEXT,
  type TEXT,
  conditions JSONB DEFAULT '{}',
  approvers JSONB DEFAULT '[]',
  status TEXT DEFAULT 'active',
  "createdBy" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- ==================== 12. 审计日志表 ====================
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  module TEXT,
  action TEXT,
  "recordId" TEXT,
  "oldData" JSONB,
  "newData" JSONB,
  operator TEXT,
  "operatedAt" TIMESTAMPTZ DEFAULT now()
);

-- ==================== 13. 通知表 ====================
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  title TEXT,
  content TEXT,
  type TEXT,
  status TEXT DEFAULT 'unread',
  "userId" TEXT,
  link TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- ==================== 14. 批次表 ====================
CREATE TABLE IF NOT EXISTS batches (
  id TEXT PRIMARY KEY,
  "batchNo" TEXT,
  "inventoryId" TEXT,
  quantity NUMERIC DEFAULT 0,
  "productionDate" TEXT,
  "expiryDate" TEXT,
  status TEXT DEFAULT 'normal',
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- ==================== 15. 待办表 ====================
CREATE TABLE IF NOT EXISTS todos (
  id TEXT PRIMARY KEY,
  title TEXT,
  type TEXT,
  priority TEXT DEFAULT 'medium',
  source TEXT,
  "sourceId" TEXT,
  status TEXT DEFAULT 'pending',
  "dueDate" TEXT,
  "startDate" TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "completedAt" TEXT,
  notes TEXT,
  tag TEXT,
  reminder TEXT,
  repeat TEXT,
  progress NUMERIC DEFAULT 0,
  remark TEXT,
  subtasks JSONB DEFAULT '[]'
);

-- ==================== 16. 标签表 ====================
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT,
  color TEXT,
  module TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- ==================== 17. 档案表 ====================
CREATE TABLE IF NOT EXISTS archives (
  id TEXT PRIMARY KEY,
  name TEXT,
  category TEXT,
  "fileUrl" TEXT,
  "fileSize" BIGINT DEFAULT 0,
  "mimeType" TEXT,
  description TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- ==================== 18. 单据设置表 ====================
CREATE TABLE IF NOT EXISTS doc_settings (
  id TEXT PRIMARY KEY,
  module TEXT,
  prefix TEXT,
  "currentNo" INTEGER DEFAULT 0,
  format TEXT,
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- ==================== 19. 成本记录表 ====================
CREATE TABLE IF NOT EXISTS cost_records (
  id TEXT PRIMARY KEY,
  "poNo" TEXT,
  "supplierId" TEXT,
  "supplierName" TEXT,
  date TEXT,
  "materialName" TEXT,
  quantity NUMERIC DEFAULT 0,
  "actualCost" NUMERIC DEFAULT 0,
  "standardCost" NUMERIC DEFAULT 0,
  variance NUMERIC DEFAULT 0,
  "varianceRate" NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'normal',
  "createdBy" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- ==================== 20. 仓库位置表 ====================
CREATE TABLE IF NOT EXISTS warehouse_locations (
  id TEXT PRIMARY KEY,
  "locationCode" TEXT,
  "warehouseName" TEXT,
  "warehouseId" TEXT,
  "areaName" TEXT,
  manager TEXT,
  "managerPhone" TEXT,
  notes TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- ==================== 21. 权限表 ====================
CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  role TEXT,
  module TEXT,
  actions JSONB DEFAULT '[]',
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- ==================== 22. 交易记录表 ====================
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  "refNo" TEXT,
  "customerId" TEXT,
  "customerName" TEXT,
  type TEXT,
  amount NUMERIC DEFAULT 0,
  date TEXT,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- ==================== 23. 采购订单表 ====================
CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY,
  "orderNo" TEXT,
  title TEXT,
  "supplierId" TEXT,
  "supplierName" TEXT,
  type TEXT DEFAULT 'purchase',
  status TEXT DEFAULT 'pending',
  items JSONB DEFAULT '[]',
  "totalAmount" NUMERIC DEFAULT 0,
  "expectedDate" TEXT,
  "actualDate" TEXT,
  requester TEXT,
  approver TEXT,
  "approveDate" TEXT,
  notes TEXT,
  "createDate" TEXT,
  attachments JSONB DEFAULT '[]',
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 启用 RLS + 策略（逐表声明，兼容 SQL Editor）
-- ============================================================

-- customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_customers" ON customers;
DROP POLICY IF EXISTS "anon_insert_customers" ON customers;
DROP POLICY IF EXISTS "anon_update_customers" ON customers;
DROP POLICY IF EXISTS "anon_delete_customers" ON customers;
CREATE POLICY "anon_select_customers" ON customers FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_customers" ON customers FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_customers" ON customers FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_customers" ON customers FOR DELETE TO anon USING (true);

-- quotations
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_quotations" ON quotations;
DROP POLICY IF EXISTS "anon_insert_quotations" ON quotations;
DROP POLICY IF EXISTS "anon_update_quotations" ON quotations;
DROP POLICY IF EXISTS "anon_delete_quotations" ON quotations;
CREATE POLICY "anon_select_quotations" ON quotations FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_quotations" ON quotations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_quotations" ON quotations FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_quotations" ON quotations FOR DELETE TO anon USING (true);

-- contracts
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_contracts" ON contracts;
DROP POLICY IF EXISTS "anon_insert_contracts" ON contracts;
DROP POLICY IF EXISTS "anon_update_contracts" ON contracts;
DROP POLICY IF EXISTS "anon_delete_contracts" ON contracts;
CREATE POLICY "anon_select_contracts" ON contracts FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_contracts" ON contracts FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_contracts" ON contracts FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_contracts" ON contracts FOR DELETE TO anon USING (true);

-- inventory
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_inventory" ON inventory;
DROP POLICY IF EXISTS "anon_insert_inventory" ON inventory;
DROP POLICY IF EXISTS "anon_update_inventory" ON inventory;
DROP POLICY IF EXISTS "anon_delete_inventory" ON inventory;
CREATE POLICY "anon_select_inventory" ON inventory FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_inventory" ON inventory FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_inventory" ON inventory FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_inventory" ON inventory FOR DELETE TO anon USING (true);

-- inbound_orders
ALTER TABLE inbound_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_inbound_orders" ON inbound_orders;
DROP POLICY IF EXISTS "anon_insert_inbound_orders" ON inbound_orders;
DROP POLICY IF EXISTS "anon_update_inbound_orders" ON inbound_orders;
DROP POLICY IF EXISTS "anon_delete_inbound_orders" ON inbound_orders;
CREATE POLICY "anon_select_inbound_orders" ON inbound_orders FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_inbound_orders" ON inbound_orders FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_inbound_orders" ON inbound_orders FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_inbound_orders" ON inbound_orders FOR DELETE TO anon USING (true);

-- outbound_orders
ALTER TABLE outbound_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_outbound_orders" ON outbound_orders;
DROP POLICY IF EXISTS "anon_insert_outbound_orders" ON outbound_orders;
DROP POLICY IF EXISTS "anon_update_outbound_orders" ON outbound_orders;
DROP POLICY IF EXISTS "anon_delete_outbound_orders" ON outbound_orders;
CREATE POLICY "anon_select_outbound_orders" ON outbound_orders FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_outbound_orders" ON outbound_orders FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_outbound_orders" ON outbound_orders FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_outbound_orders" ON outbound_orders FOR DELETE TO anon USING (true);

-- deliveries
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_deliveries" ON deliveries;
DROP POLICY IF EXISTS "anon_insert_deliveries" ON deliveries;
DROP POLICY IF EXISTS "anon_update_deliveries" ON deliveries;
DROP POLICY IF EXISTS "anon_delete_deliveries" ON deliveries;
CREATE POLICY "anon_select_deliveries" ON deliveries FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_deliveries" ON deliveries FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_deliveries" ON deliveries FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_deliveries" ON deliveries FOR DELETE TO anon USING (true);

-- collections
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_collections" ON collections;
DROP POLICY IF EXISTS "anon_insert_collections" ON collections;
DROP POLICY IF EXISTS "anon_update_collections" ON collections;
DROP POLICY IF EXISTS "anon_delete_collections" ON collections;
CREATE POLICY "anon_select_collections" ON collections FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_collections" ON collections FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_collections" ON collections FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_collections" ON collections FOR DELETE TO anon USING (true);

-- statements
ALTER TABLE statements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_statements" ON statements;
DROP POLICY IF EXISTS "anon_insert_statements" ON statements;
DROP POLICY IF EXISTS "anon_update_statements" ON statements;
DROP POLICY IF EXISTS "anon_delete_statements" ON statements;
CREATE POLICY "anon_select_statements" ON statements FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_statements" ON statements FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_statements" ON statements FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_statements" ON statements FOR DELETE TO anon USING (true);

-- suppliers
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_suppliers" ON suppliers;
DROP POLICY IF EXISTS "anon_insert_suppliers" ON suppliers;
DROP POLICY IF EXISTS "anon_update_suppliers" ON suppliers;
DROP POLICY IF EXISTS "anon_delete_suppliers" ON suppliers;
CREATE POLICY "anon_select_suppliers" ON suppliers FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_suppliers" ON suppliers FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_suppliers" ON suppliers FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_suppliers" ON suppliers FOR DELETE TO anon USING (true);

-- approval_rules
ALTER TABLE approval_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_approval_rules" ON approval_rules;
DROP POLICY IF EXISTS "anon_insert_approval_rules" ON approval_rules;
DROP POLICY IF EXISTS "anon_update_approval_rules" ON approval_rules;
DROP POLICY IF EXISTS "anon_delete_approval_rules" ON approval_rules;
CREATE POLICY "anon_select_approval_rules" ON approval_rules FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_approval_rules" ON approval_rules FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_approval_rules" ON approval_rules FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_approval_rules" ON approval_rules FOR DELETE TO anon USING (true);

-- audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "anon_insert_audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "anon_update_audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "anon_delete_audit_logs" ON audit_logs;
CREATE POLICY "anon_select_audit_logs" ON audit_logs FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_audit_logs" ON audit_logs FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_audit_logs" ON audit_logs FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_audit_logs" ON audit_logs FOR DELETE TO anon USING (true);

-- notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_notifications" ON notifications;
DROP POLICY IF EXISTS "anon_insert_notifications" ON notifications;
DROP POLICY IF EXISTS "anon_update_notifications" ON notifications;
DROP POLICY IF EXISTS "anon_delete_notifications" ON notifications;
CREATE POLICY "anon_select_notifications" ON notifications FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_notifications" ON notifications FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_notifications" ON notifications FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_notifications" ON notifications FOR DELETE TO anon USING (true);

-- batches
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_batches" ON batches;
DROP POLICY IF EXISTS "anon_insert_batches" ON batches;
DROP POLICY IF EXISTS "anon_update_batches" ON batches;
DROP POLICY IF EXISTS "anon_delete_batches" ON batches;
CREATE POLICY "anon_select_batches" ON batches FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_batches" ON batches FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_batches" ON batches FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_batches" ON batches FOR DELETE TO anon USING (true);

-- todos
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_todos" ON todos;
DROP POLICY IF EXISTS "anon_insert_todos" ON todos;
DROP POLICY IF EXISTS "anon_update_todos" ON todos;
DROP POLICY IF EXISTS "anon_delete_todos" ON todos;
CREATE POLICY "anon_select_todos" ON todos FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_todos" ON todos FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_todos" ON todos FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_todos" ON todos FOR DELETE TO anon USING (true);

-- tags
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_tags" ON tags;
DROP POLICY IF EXISTS "anon_insert_tags" ON tags;
DROP POLICY IF EXISTS "anon_update_tags" ON tags;
DROP POLICY IF EXISTS "anon_delete_tags" ON tags;
CREATE POLICY "anon_select_tags" ON tags FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_tags" ON tags FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_tags" ON tags FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_tags" ON tags FOR DELETE TO anon USING (true);

-- archives
ALTER TABLE archives ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_archives" ON archives;
DROP POLICY IF EXISTS "anon_insert_archives" ON archives;
DROP POLICY IF EXISTS "anon_update_archives" ON archives;
DROP POLICY IF EXISTS "anon_delete_archives" ON archives;
CREATE POLICY "anon_select_archives" ON archives FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_archives" ON archives FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_archives" ON archives FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_archives" ON archives FOR DELETE TO anon USING (true);

-- doc_settings
ALTER TABLE doc_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_doc_settings" ON doc_settings;
DROP POLICY IF EXISTS "anon_insert_doc_settings" ON doc_settings;
DROP POLICY IF EXISTS "anon_update_doc_settings" ON doc_settings;
DROP POLICY IF EXISTS "anon_delete_doc_settings" ON doc_settings;
CREATE POLICY "anon_select_doc_settings" ON doc_settings FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_doc_settings" ON doc_settings FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_doc_settings" ON doc_settings FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_doc_settings" ON doc_settings FOR DELETE TO anon USING (true);

-- cost_records
ALTER TABLE cost_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_cost_records" ON cost_records;
DROP POLICY IF EXISTS "anon_insert_cost_records" ON cost_records;
DROP POLICY IF EXISTS "anon_update_cost_records" ON cost_records;
DROP POLICY IF EXISTS "anon_delete_cost_records" ON cost_records;
CREATE POLICY "anon_select_cost_records" ON cost_records FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_cost_records" ON cost_records FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_cost_records" ON cost_records FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_cost_records" ON cost_records FOR DELETE TO anon USING (true);

-- warehouse_locations
ALTER TABLE warehouse_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_warehouse_locations" ON warehouse_locations;
DROP POLICY IF EXISTS "anon_insert_warehouse_locations" ON warehouse_locations;
DROP POLICY IF EXISTS "anon_update_warehouse_locations" ON warehouse_locations;
DROP POLICY IF EXISTS "anon_delete_warehouse_locations" ON warehouse_locations;
CREATE POLICY "anon_select_warehouse_locations" ON warehouse_locations FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_warehouse_locations" ON warehouse_locations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_warehouse_locations" ON warehouse_locations FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_warehouse_locations" ON warehouse_locations FOR DELETE TO anon USING (true);

-- permissions
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_permissions" ON permissions;
DROP POLICY IF EXISTS "anon_insert_permissions" ON permissions;
DROP POLICY IF EXISTS "anon_update_permissions" ON permissions;
DROP POLICY IF EXISTS "anon_delete_permissions" ON permissions;
CREATE POLICY "anon_select_permissions" ON permissions FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_permissions" ON permissions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_permissions" ON permissions FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_permissions" ON permissions FOR DELETE TO anon USING (true);

-- transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_transactions" ON transactions;
DROP POLICY IF EXISTS "anon_insert_transactions" ON transactions;
DROP POLICY IF EXISTS "anon_update_transactions" ON transactions;
DROP POLICY IF EXISTS "anon_delete_transactions" ON transactions;
CREATE POLICY "anon_select_transactions" ON transactions FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_transactions" ON transactions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_transactions" ON transactions FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_transactions" ON transactions FOR DELETE TO anon USING (true);

-- purchase_orders
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_purchase_orders" ON purchase_orders;
DROP POLICY IF EXISTS "anon_insert_purchase_orders" ON purchase_orders;
DROP POLICY IF EXISTS "anon_update_purchase_orders" ON purchase_orders;
DROP POLICY IF EXISTS "anon_delete_purchase_orders" ON purchase_orders;
CREATE POLICY "anon_select_purchase_orders" ON purchase_orders FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_purchase_orders" ON purchase_orders FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_purchase_orders" ON purchase_orders FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_purchase_orders" ON purchase_orders FOR DELETE TO anon USING (true);

-- ============================================================
-- Realtime 启用方式：
-- 请在 Supabase Dashboard → Database → Replication 中
-- 逐个勾选以下 23 张表即可，无需 SQL 语句
-- ============================================================
