import { buildSmartKeyValueTemplate, buildSmartTemplate } from '@/composables/useSmartRecognizeTemplate'

export const SMART_TEMPLATE_SPECS = {
  transaction: {
    name: 'transaction-recognition-template.txt',
    content: buildSmartKeyValueTemplate(['客户名称', '金额', '日期', '交易类型', '备注'])
  },
  supplier: {
    name: 'supplier-recognition-template.txt',
    content: buildSmartKeyValueTemplate([
      '供应商名称',
      '联系人',
      '电话',
      '邮箱',
      '地址',
      '银行名称',
      '银行账号',
      '备注'
    ])
  },
  payment: {
    name: 'payment-recognition-template.txt',
    content: buildSmartKeyValueTemplate(['付款金额', '付款方式', '银行名称', '参考编号', '付款日期', '备注'])
  },
  receipt: {
    name: 'receipt-recognition-template.txt',
    content: buildSmartKeyValueTemplate(['收款金额', '收款方式', '银行名称', '参考编号', '收款日期', '备注'])
  },
  quotation: {
    name: 'quotation-recognition-template.txt',
    content: buildSmartTemplate({
      tableHeaders: [
        { key: 'grade', label: '牌号/规格', type: 'string' },
        { key: 'standard', label: '材料标准', type: 'string' },
        { key: 'qty', label: '数量(KG)', type: 'number' },
        { key: 'price', label: '含税单价(元/KG)', type: 'number' },
        { key: 'remark', label: '备注', type: 'string' }
      ],
      fields: [
        '客户公司全称',
        '联系人姓名',
        '联系电话',
        '交货地点',
        '客户地址',
        '付款方式',
        '交货周期',
        '税率(%)',
        '备注'
      ]
    })
  },
  contract: {
    name: 'contract-recognition-template.txt',
    content: buildSmartTemplate({
      tableHeaders: [
        { key: 'productName', label: '产品名称', type: 'string' },
        { key: 'spec', label: '规格型号', type: 'string' },
        { key: 'quantity', label: '数量(KG)', type: 'number' },
        { key: 'unitPrice', label: '含税单价(元/KG)', type: 'number' },
        { key: 'deliveryPlace', label: '交货地点', type: 'string' },
        { key: 'remark', label: '备注', type: 'string' }
      ],
      fields: [
        '合同编号',
        '合同名称',
        '甲方',
        '乙方',
        '签约日期',
        '签约地点',
        '交货方式',
        '生效日期',
        '甲方联系人',
        '乙方联系人',
        '地址',
        '备注'
      ]
    })
  },
  productionOrder: {
    name: 'production-order-recognition-template.txt',
    content: buildSmartTemplate({
      tableHeaders: [],
      fields: [
        'BOM编号',
        '产品名称',
        '数量',
        '单位',
        '优先级',
        '计划开始日期',
        '计划完成日期',
        '车间',
        '负责人',
        '备注'
      ]
    })
  },
  bom: {
    name: 'bom-recognition-template.txt',
    content: buildSmartTemplate({
      tableHeaders: [
        { key: 'materialCode', label: '物料编码', type: 'string' },
        { key: 'materialName', label: '物料名称', type: 'string' },
        { key: 'spec', label: '规格', type: 'string' },
        { key: 'unit', label: '单位', type: 'string' },
        { key: 'quantity', label: '数量', type: 'number' },
        { key: 'scrapRate', label: '损耗率', type: 'number' },
        { key: 'notes', label: '备注', type: 'string' }
      ],
      fields: ['BOM编号', 'BOM名称', '产品名称', '版本', '说明', '备注']
    })
  },
  inbound: {
    name: 'inbound-recognition-template.txt',
    content: buildSmartTemplate({
      tableHeaders: [
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
      ],
      fields: ['入库单号', '单据日期', '供应商', '仓库', '备注']
    })
  },
  outbound: {
    name: 'outbound-recognition-template.txt',
    content: buildSmartTemplate({
      tableHeaders: [
        { key: 'materialCode', label: '物料编码', type: 'string' },
        { key: 'materialName', label: '物料名称', type: 'string' },
        { key: 'spec', label: '规格', type: 'string' },
        { key: 'unit', label: '单位', type: 'string' },
        { key: 'quantity', label: '数量', type: 'number' },
        { key: 'unitPrice', label: '单价', type: 'number' }
      ],
      fields: [
        '出库单号',
        '出库类型',
        '出库日期',
        '客户名称',
        '车间',
        '等级',
        '颜色',
        '数量',
        '单价',
        '仓库',
        '库位',
        '批号',
        '备注'
      ]
    })
  },
  projectTracking: {
    name: 'project-tracking-recognition-template.txt',
    content: buildSmartTemplate({
      tableHeaders: [],
      fields: [
        '客户',
        'OEM/品牌',
        '项目名称',
        '产品型号',
        '材料',
        '材料等级',
        '供应商',
        '竞品',
        '颜色',
        '阶段',
        '报价状态',
        '合同状态',
        '质保状态',
        'SOP',
        '负责人',
        '下次跟进',
        '备注'
      ]
    })
  },
  deliveries: {
    name: 'deliveries-recognition-template.txt',
    content: buildSmartTemplate({
      tableHeaders: [
        { key: 'materialCode', label: '物料编码', type: 'string' },
        { key: 'materialName', label: '物料名称', type: 'string' },
        { key: 'spec', label: '规格', type: 'string' },
        { key: 'unit', label: '单位', type: 'string' },
        { key: 'quantity', label: '数量', type: 'number' },
        { key: 'unitPrice', label: '单价', type: 'number' },
        { key: 'amount', label: '金额', type: 'number' }
      ],
      fields: [
        '送货单号',
        '客户',
        '收货单位',
        '送货日期',
        '预计到货',
        '运输方式',
        '送货地点',
        '公司名称',
        '公司电话',
        '联系人',
        '收货人',
        '签收人',
        '签收日期',
        '备注'
      ]
    })
  },
  customer: {
    name: 'customer-recognition-template.csv',
    content: buildSmartTemplate({
      tableHeaders: [
        { key: 'fullName', label: '客户全称', type: 'string' },
        { key: 'contactName', label: '联系人', type: 'string' },
        { key: 'phone', label: '电话', type: 'string' },
        { key: 'email', label: '邮箱', type: 'string' },
        { key: 'region', label: '地区', type: 'string' },
        { key: 'address', label: '地址', type: 'string' }
      ],
      fields: []
    })
  },
  purchase: {
    name: 'purchase-recognition-template.txt',
    content: buildSmartTemplate({
      tableHeaders: [
        { key: 'materialCode', label: '物料编码', type: 'string' },
        { key: 'materialName', label: '物料名称', type: 'string' },
        { key: 'spec', label: '规格', type: 'string' },
        { key: 'unit', label: '单位', type: 'string' },
        { key: 'quantity', label: '数量', type: 'number' },
        { key: 'unitPrice', label: '单价', type: 'number' },
        { key: 'amount', label: '金额', type: 'number' }
      ],
      fields: ['供应商名称', '联系人', '电话', '预计到货日期', '备注']
    })
  },
  statement: {
    name: 'statement-recognition-template.txt',
    content: buildSmartTemplate({
      tableHeaders: [
        { key: 'date', label: '日期', type: 'string' },
        { key: 'name', label: '名称', type: 'string' },
        { key: 'code', label: '编号', type: 'string' },
        { key: 'spec', label: '规格', type: 'string' },
        { key: 'unit', label: '单位', type: 'string' },
        { key: 'qty', label: '数量', type: 'number' },
        { key: 'price', label: '单价', type: 'number' },
        { key: 'remark', label: '备注', type: 'string' }
      ],
      fields: [
        '结算周期',
        '对账日期',
        '付款方',
        '付款方联系人',
        '联系电话',
        '收款方式',
        '开户银行',
        '银行账号',
        '收款人',
        '收款账户',
        '税率(%)'
      ]
    })
  },
  stocktaking: {
    name: 'stocktaking-recognition-template.txt',
    content: buildSmartTemplate({
      tableHeaders: [
        { key: 'materialCode', label: '物料编码', type: 'string' },
        { key: 'materialName', label: '物料名称', type: 'string' },
        { key: 'grade', label: '等级', type: 'string' },
        { key: 'color', label: '颜色', type: 'string' },
        { key: 'actualQty', label: '实际数量', type: 'number' },
        { key: 'warehouseLocation', label: '库位', type: 'string' }
      ],
      fields: ['盘点单号', '仓库', '盘点人员', '盘点日期', '备注']
    })
  },
  transfer: {
    name: 'transfer-recognition-template.txt',
    content: buildSmartTemplate({
      tableHeaders: [
        { key: 'materialCode', label: '物料编码', type: 'string' },
        { key: 'materialName', label: '物料名称', type: 'string' },
        { key: 'spec', label: '规格', type: 'string' },
        { key: 'unit', label: '单位', type: 'string' },
        { key: 'quantity', label: '数量', type: 'number' },
        { key: 'unitPrice', label: '单价', type: 'number' }
      ],
      fields: ['调拨类型', '调出仓库', '调入仓库', '申请人', '调拨日期', '备注']
    })
  }
}
