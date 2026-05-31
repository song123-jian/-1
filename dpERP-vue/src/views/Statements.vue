<template>
  <div class="statement-page">
    <div class="page-header">
      <div>
        <h2 class="page-header-title">对账管理</h2>
        <p class="page-header-subtitle">苏州冠久标准化对账单 · 客户对账单生成、审核与确认</p>
      </div>
      <div class="page-header-actions">
        <div class="view-toggle">
          <button
            v-for="v in viewOptions"
            :key="v.key"
            class="btn btn-outline"
            :class="{ active: currentView === v.key }"
            @click="currentView = v.key"
            :title="v.label"
          >{{ v.label }}</button>
        </div>
        <div class="export-dropdown-wrapper">
          <button class="btn btn-outline" @click="showExportMenu = !showExportMenu">导出 ▼</button>
          <div v-if="showExportMenu" class="export-dropdown-menu">
            <div class="export-dropdown-item" @click="exportCSV(); showExportMenu = false">导出 CSV</div>
            <div class="export-dropdown-item" @click="exportXLSX(); showExportMenu = false">导出 Excel (.xlsx)</div>
            <div class="export-dropdown-item" @click="exportPDF(); showExportMenu = false">导出 PDF</div>
          </div>
        </div>
        <button class="btn btn-outline" @click="resetFilters">重置</button>
        <button class="btn btn-outline" @click="handleBatchPrint" :disabled="selectedIds.length === 0">批量打印</button>
        <button class="btn btn-outline" @click="handleBatchDelete" :disabled="selectedIds.length === 0">批量删除</button>
        <button class="btn btn-primary" @click="openEditor()">+ 新增对账单</button>
      </div>
    </div>

    <div v-if="alerts.length > 0" class="panel-card" style="margin-bottom:var(--space-4);border-left:3px solid var(--color-warning)">
      <div class="panel-card-header">
        <span class="panel-card-title">预警提醒</span>
      </div>
      <div class="panel-card-body">
        <div v-for="a in alerts" :key="a.id + a.type" class="alert-item" :class="'alert-' + a.priority">
          <span class="alert-message">{{ a.message }}</span>
          <button class="btn btn-sm btn-outline" @click="viewDetail(a.id)">查看</button>
        </div>
      </div>
    </div>

    <div class="stats-row stats-grid-5">
      <div class="stat-card">
        <div class="stat-card-value" style="font-size:var(--font-size-xl)">{{ statementStore.totalStatements }}</div>
        <div class="stat-card-label">对账单总数</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value" style="color:var(--color-warning);font-size:var(--font-size-xl)">{{ statementStore.pendingCount }}</div>
        <div class="stat-card-label">待审核</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value" style="color:var(--color-success);font-size:var(--font-size-xl)">{{ statementStore.confirmedCount }}</div>
        <div class="stat-card-label">已确认</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value" style="color:var(--color-info);font-size:var(--font-size-xl)">{{ statementStore.paidCount }}</div>
        <div class="stat-card-label">已付款</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value" style="color:var(--color-danger);font-size:var(--font-size-xl)">¥{{ formatMoney(statementStore.totalBalance) }}</div>
        <div class="stat-card-label">未结余额</div>
      </div>
    </div>

    <div class="filter-bar">
      <input
        type="text"
        class="form-input"
        v-model="filters.search"
        placeholder="搜索对账单号..."
        style="min-width:160px"
      >
      <input
        type="month"
        class="form-input"
        v-model="filters.period"
        title="账单期间"
        style="width:160px"
      >
      <select class="form-select" v-model="filters.status">
        <option value="">全部状态</option>
        <option value="draft">草稿</option>
        <option value="pending">待审核</option>
        <option value="confirmed">已确认</option>
        <option value="paid">已付款</option>
        <option value="voided">已作废</option>
      </select>
    </div>

    <div class="panel-card">
      <div class="panel-card-body no-padding">
        <div class="table-container" v-if="currentView === 'table'">
          <table class="data-table">
            <thead>
              <tr>
                <th style="min-width:120px">对账单号</th>
                <th style="min-width:100px">日期</th>
                <th style="min-width:140px">采购方</th>
                <th style="min-width:140px">供应商</th>
                <th style="min-width:90px">单价</th>
                <th style="min-width:70px">数量</th>
                <th style="min-width:100px">总金额</th>
                <th style="min-width:80px">状态</th>
                <th style="min-width:100px">创建日期</th>
                <th style="min-width:180px">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filteredStatements.length === 0">
                <td colspan="10" class="empty-state">
                  暂无对账单
                </td>
              </tr>
              <tr v-for="s in filteredStatements" :key="s.id">
                <td class="cell-mono" style="cursor:pointer;color:var(--color-accent)" @click="viewDetail(s.id)">{{ s.statementNo }}</td>
                <td>{{ s.reconDate || '-' }}</td>
                <td>{{ s.buyerName || '-' }}</td>
                <td>{{ s.sellerName || '-' }}</td>
                <td class="cell-mono">¥{{ formatMoney(getFirstItemPrice(s)) }}</td>
                <td class="cell-mono">{{ getFirstItemQty(s) }}</td>
                <td class="cell-mono">¥{{ formatMoney(s.totalAmount) }}</td>
                <td>
                  <span class="status-badge" :class="statementStore.statusBadgeMap[s.status] || 'neutral'">
                    {{ statementStore.statusLabels[s.status] || s.status }}
                  </span>
                </td>
                <td style="font-size:var(--font-size-xs)">{{ s.createdAt || '-' }}</td>
                <td class="cell-actions">
                  <button class="btn btn-sm btn-outline" @click="viewDetail(s.id)" title="查看">查看</button>
                  <button
                    v-if="s.status === 'pending' || s.status === 'draft'"
                    class="btn btn-sm btn-outline"
                    @click="openEditor(s)"
                    title="编辑"
                  >编辑</button>
                  <button
                    v-if="s.status === 'pending'"
                    class="btn btn-sm btn-outline"
                    style="color:var(--color-success)"
                    @click="handleConfirm(s.id)"
                    title="确认"
                  >确认</button>
                  <button
                    v-if="s.status === 'pending'"
                    class="btn btn-sm btn-outline"
                    style="color:var(--color-danger)"
                    @click="handleVoid(s.id)"
                    title="作废"
                  >作废</button>
                  <button
                    v-if="s.status === 'confirmed'"
                    class="btn btn-sm btn-outline"
                    style="color:var(--color-info)"
                    @click="handleMarkPaid(s)"
                    title="记录付款"
                  >记录付款</button>
                  <button
                    v-if="s.status === 'confirmed' || s.status === 'voided'"
                    class="btn btn-sm btn-outline"
                    @click="handleReopen(s.id)"
                    title="重新打开"
                  >重新打开</button>
                  <button class="btn btn-sm btn-outline" @click="handlePrint(s.id)" title="打印">打印</button>
                  <button
                    v-if="s.status === 'pending' || s.status === 'draft'"
                    class="btn btn-sm btn-outline"
                    style="color:var(--color-danger)"
                    @click="handleDelete(s.id)"
                    title="删除"
                  >删除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else-if="currentView === 'list'" class="list-view">
          <div
            v-for="s in filteredStatements"
            :key="s.id"
            class="list-item"
            @click="viewDetail(s.id)"
          >
            <div class="list-item-header">
              <span class="list-item-title">{{ s.statementNo }}</span>
              <span class="status-badge" :class="statementStore.statusBadgeMap[s.status] || 'neutral'">
                {{ statementStore.statusLabels[s.status] || s.status }}
              </span>
            </div>
            <div class="list-item-meta">
              <span>{{ s.reconDate || '-' }}</span>
              <span>{{ s.buyerName }}</span>
              <span>{{ s.sellerName }}</span>
              <span>¥{{ formatMoney(s.totalAmount) }}</span>
            </div>
          </div>
          <div v-if="filteredStatements.length === 0" class="empty-state">
            暂无对账单
          </div>
        </div>

        <div v-else-if="currentView === 'card'" class="card-view">
          <div
            v-for="s in filteredStatements"
            :key="s.id"
            class="statement-card"
            @click="viewDetail(s.id)"
          >
            <div class="card-header">
              <span class="card-title">{{ s.statementNo }}</span>
              <span class="status-badge" :class="statementStore.statusBadgeMap[s.status] || 'neutral'">
                {{ statementStore.statusLabels[s.status] || s.status }}
              </span>
            </div>
            <div class="card-body">
              <div class="card-field"><span class="card-label">日期</span><span>{{ s.reconDate || '-' }}</span></div>
              <div class="card-field"><span class="card-label">采购方</span><span>{{ s.buyerName }}</span></div>
              <div class="card-field"><span class="card-label">供应商</span><span>{{ s.sellerName }}</span></div>
              <div class="card-field"><span class="card-label">金额</span><span class="cell-mono">¥{{ formatMoney(s.totalAmount) }}</span></div>
            </div>
            <div class="card-actions">
              <button class="btn btn-sm btn-outline" @click.stop="viewDetail(s.id)">查看</button>
              <button v-if="s.status === 'pending'" class="btn btn-sm btn-outline" style="color:var(--color-success)" @click.stop="handleConfirm(s.id)">确认</button>
            </div>
          </div>
          <div v-if="filteredStatements.length === 0" class="empty-state">
            暂无对账单
          </div>
        </div>
      </div>
    </div>

    <div v-if="showEditor" class="modal-overlay" @click.self="closeEditor">
      <div class="modal-content modal-wide">
        <div class="modal-header">
          <h3 class="modal-title">{{ editingId ? '编辑对账单' : '新建对账单' }}</h3>
          <button class="modal-close" @click="closeEditor">✕</button>
        </div>
        <div class="modal-body">
          <!-- 步骤指示器 -->
          <div class="wizard-steps">
            <div class="wizard-step" :class="{ active: editorStep === 1, completed: editorStep > 1 }">
              <div class="step-number">1</div>
              <div class="step-label">基本信息</div>
            </div>
            <div class="wizard-step-line" :class="{ completed: editorStep > 1 }"></div>
            <div class="wizard-step" :class="{ active: editorStep === 2, completed: editorStep > 2 }">
              <div class="step-number">2</div>
              <div class="step-label">交易双方</div>
            </div>
            <div class="wizard-step-line" :class="{ completed: editorStep > 2 }"></div>
            <div class="wizard-step" :class="{ active: editorStep === 3, completed: editorStep > 3 }">
              <div class="step-number">3</div>
              <div class="step-label">交易明细</div>
            </div>
            <div class="wizard-step-line" :class="{ completed: editorStep > 3 }"></div>
            <div class="wizard-step" :class="{ active: editorStep === 4 }">
              <div class="step-number">4</div>
              <div class="step-label">付款条款</div>
            </div>
          </div>

          <!-- 步骤1：基本信息 -->
          <div v-if="editorStep === 1" class="wizard-content">
            <div class="form-row form-row-3">
              <div class="form-group">
                <label class="form-label">对账单号</label>
                <input type="text" class="form-input" v-model="editorData.statementNo" readonly>
              </div>
              <div class="form-group">
                <label class="form-label">账单期间</label>
                <input type="month" class="form-input" v-model="editorData.period" @change="onPeriodChange">
              </div>
              <div class="form-group">
                <label class="form-label">对账日期</label>
                <input type="date" class="form-input" v-model="editorData.reconDate">
              </div>
            </div>
            <div class="form-row form-row-3">
              <div class="form-group">
                <label class="form-label">联系方式</label>
                <input type="text" class="form-input" v-model="editorData.contactPhone" placeholder="联系电话">
              </div>
              <div class="form-group">
                <label class="form-label">制单人</label>
                <input type="text" class="form-input" v-model="editorData.preparer" placeholder="制单人">
              </div>
              <div class="form-group">
                <label class="form-label">审核人</label>
                <select class="form-select" v-model="editorData.reviewer">
                  <option value="">请选择</option>
                  <option value="admin">管理员</option>
                  <option value="finance">财务主管</option>
                </select>
              </div>
            </div>
          </div>

          <!-- 步骤2：交易双方 -->
          <div v-if="editorStep === 2" class="wizard-content">
            <div class="form-row form-row-2">
              <div class="form-group">
                <label class="form-label">采购方</label>
                <select class="form-select" v-model="editorData.buyerId" @change="onBuyerChange">
                  <option value="">请选择采购方</option>
                  <option v-for="c in customerStore.customers" :key="c.id" :value="c.id">{{ c.name || c.fullName || c.companyName }}</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">供应商</label>
                <select class="form-select" v-model="editorData.sellerId" @change="onSellerChange">
                  <option value="">请选择供应商</option>
                  <option v-for="s in dataStore.suppliers" :key="s.id" :value="s.id">{{ s.name || s.shortName }}</option>
                </select>
              </div>
            </div>
            <div class="form-row form-row-2">
              <div class="form-group">
                <label class="form-label">采购方地址</label>
                <input type="text" class="form-input" v-model="editorData.buyerAddress">
              </div>
              <div class="form-group">
                <label class="form-label">供应商地址</label>
                <input type="text" class="form-input" v-model="editorData.sellerAddress">
              </div>
            </div>
            <div class="form-row form-row-2">
              <div class="form-group">
                <label class="form-label">采购方联系人</label>
                <input type="text" class="form-input" v-model="editorData.buyerContact">
              </div>
              <div class="form-group">
                <label class="form-label">供应商联系人</label>
                <input type="text" class="form-input" v-model="editorData.sellerContact">
              </div>
            </div>
            <div class="form-row form-row-2">
              <div class="form-group">
                <label class="form-label">采购方电话</label>
                <input type="text" class="form-input" v-model="editorData.buyerPhone">
              </div>
              <div class="form-group">
                <label class="form-label">供应商电话</label>
                <input type="text" class="form-input" v-model="editorData.sellerPhone">
              </div>
            </div>
          </div>

          <!-- 步骤3：交易明细 -->
          <div v-if="editorStep === 3" class="wizard-content">
            <div style="display:flex;gap:var(--space-2);margin-bottom:var(--space-3)">
              <button class="btn btn-sm btn-outline" @click="addItemRow">+ 添加一行</button>
              <button class="btn btn-sm btn-outline" @click="autoFetchTransactions">自动拉取交易</button>
              <button class="btn btn-sm btn-outline" @click="clearItems" style="color:var(--color-danger)">清空</button>
              <span style="margin-left:auto;font-size:var(--font-size-sm);color:var(--color-text-secondary)">共 {{ editorItems.length }} 条</span>
            </div>
            <div class="table-container" style="max-height:300px;overflow-y:auto">
              <table class="data-table" style="font-size:var(--font-size-xs)">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>日期</th>
                    <th>货物名称</th>
                    <th>料号</th>
                    <th>规格</th>
                    <th>单位</th>
                    <th>数量</th>
                    <th>单价</th>
                    <th>金额</th>
                    <th>备注</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="editorItems.length === 0">
                    <td colspan="11" style="text-align:center;color:var(--color-text-tertiary);padding:var(--space-3)">暂无明细，请点击"添加一行"</td>
                  </tr>
                  <tr v-for="(item, idx) in editorItems" :key="idx">
                    <td style="text-align:center">{{ idx + 1 }}</td>
                    <td><input type="date" class="form-input form-input-xs" v-model="item.date"></td>
                    <td><input class="form-input form-input-xs" v-model="item.name" placeholder="名称"></td>
                    <td><input class="form-input form-input-xs" style="width:80px" v-model="item.code" placeholder="料号"></td>
                    <td><input class="form-input form-input-xs" v-model="item.spec" placeholder="规格"></td>
                    <td>
                      <select class="form-select form-input-xs" style="width:65px" v-model="item.unit">
                        <option value="个">个</option>
                        <option value="件">件</option>
                        <option value="kg">kg</option>
                        <option value="米">米</option>
                        <option value="箱">箱</option>
                        <option value="台">台</option>
                        <option value="套">套</option>
                      </select>
                    </td>
                    <td><input type="number" class="form-input form-input-xs" style="width:70px;text-align:right" v-model.number="item.qty" step="0.01" min="0" @input="calcItemAmount(idx)"></td>
                    <td><input type="number" class="form-input form-input-xs" style="width:80px;text-align:right" v-model.number="item.price" step="0.01" min="0" @input="calcItemAmount(idx)"></td>
                    <td style="text-align:right;font-weight:600">¥{{ formatMoney(item.amount) }}</td>
                    <td><input class="form-input form-input-xs" style="width:60px" v-model="item.remark" placeholder="备注"></td>
                    <td><button class="btn btn-sm btn-outline" style="color:var(--color-danger);padding:0 4px" @click="removeItemRow(idx)">删除</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="editor-section" style="margin-top:var(--space-4)">
              <h4 class="editor-section-title">金额合计</h4>
              <div class="form-row form-row-3">
                <div class="form-group">
                  <label class="form-label">税率(%)</label>
                  <input type="number" class="form-input" v-model.number="editorData.taxRate" @input="calcAmounts">
                </div>
                <div class="form-group">
                  <label class="form-label">小计</label>
                  <input type="text" class="form-input" :value="'¥' + formatMoney(calcSubtotal)" readonly>
                </div>
                <div class="form-group">
                  <label class="form-label">税额</label>
                  <input type="text" class="form-input" :value="'¥' + formatMoney(calcTaxAmount)" readonly>
                </div>
              </div>
              <div class="form-row form-row-2">
                <div class="form-group">
                  <label class="form-label">合计</label>
                  <input type="text" class="form-input" :value="'¥' + formatMoney(calcTotalAmount)" readonly style="color:var(--color-danger);font-weight:700">
                </div>
                <div class="form-group">
                  <label class="form-label">大写金额</label>
                  <input type="text" class="form-input" :value="calcTotalChinese" readonly style="color:var(--color-danger)">
                </div>
              </div>
            </div>
          </div>

          <!-- 步骤4：付款条款 -->
          <div v-if="editorStep === 4" class="wizard-content">
            <div class="form-row form-row-2">
              <div class="form-group">
                <label class="form-label">付款方式</label>
                <select class="form-select" v-model="editorData.paymentMethod">
                  <option value="">请选择</option>
                  <option value="银行转账">银行转账</option>
                  <option value="承兑汇票">承兑汇票</option>
                  <option value="现金">现金</option>
                  <option value="月结">月结</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">付款期限</label>
                <select class="form-select" v-model="editorData.paymentTerm">
                  <option value="">请选择</option>
                  <option value="月结30天">月结30天</option>
                  <option value="月结60天">月结60天</option>
                  <option value="票到15天">票到15天</option>
                  <option value="票到30天">票到30天</option>
                  <option value="货到付款">货到付款</option>
                </select>
              </div>
            </div>
            <div class="form-row form-row-2">
              <div class="form-group">
                <label class="form-label">开户银行</label>
                <input type="text" class="form-input" v-model="editorData.bankName">
              </div>
              <div class="form-group">
                <label class="form-label">银行账号</label>
                <input type="text" class="form-input" v-model="editorData.bankAccount">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">账户名称</label>
              <input type="text" class="form-input" v-model="editorData.bankHolder">
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="prevStep" v-if="editorStep > 1">上一步</button>
          <button class="btn btn-outline" @click="closeEditor">取消</button>
          <button class="btn btn-primary" @click="nextStep" v-if="editorStep < 4">下一步</button>
          <button class="btn btn-outline" @click="saveDraft" v-if="editorStep === 4">保存草稿</button>
          <button class="btn btn-primary" @click="submitStatement" v-if="editorStep === 4">提交审核</button>
        </div>
      </div>
    </div>

    <div v-if="showDetail" class="modal-overlay" @click.self="closeDetail">
      <div class="modal-content" style="max-width:800px">
        <div class="modal-header">
          <h3>对账单详情 - {{ detailData.statementNo }}</h3>
          <button class="btn btn-sm btn-outline" @click="closeDetail">关闭</button>
        </div>
        <div class="modal-body" style="max-height:70vh;overflow-y:auto">
          <div class="detail-section">
            <div class="detail-section-header">
              <span>账单抬头信息</span>
              <span class="status-badge" :class="statementStore.statusBadgeMap[detailData.status]">
                {{ statementStore.statusLabels[detailData.status] }}
              </span>
            </div>
            <div class="detail-grid">
              <div class="detail-item"><span class="detail-label">账单编号</span><span class="detail-value cell-mono">{{ detailData.statementNo }}</span></div>
              <div class="detail-item"><span class="detail-label">账单类型</span><span class="detail-value">{{ detailData.type || '月度对账单' }}</span></div>
              <div class="detail-item"><span class="detail-label">账单期间</span><span class="detail-value">{{ formatPeriod(detailData.period) }}</span></div>
              <div class="detail-item"><span class="detail-label">对账日期</span><span class="detail-value">{{ detailData.reconDate || '-' }}</span></div>
              <div class="detail-item"><span class="detail-label">制单人</span><span class="detail-value">{{ detailData.preparer || '-' }}</span></div>
              <div class="detail-item"><span class="detail-label">审核人</span><span class="detail-value">{{ detailData.reviewer || '-' }}</span></div>
            </div>
          </div>

          <div class="detail-section">
            <div class="detail-section-header"><span>交易双方</span></div>
            <div class="detail-parties">
              <div class="detail-party">
                <h5 style="color:var(--color-accent);margin:0 0 var(--space-2) 0">采购方</h5>
                <div><strong>公司：</strong>{{ detailData.buyerName || '-' }}</div>
                <div><strong>地址：</strong>{{ detailData.buyerAddress || '-' }}</div>
                <div><strong>联系人：</strong>{{ detailData.buyerContact || '-' }}</div>
                <div><strong>电话：</strong>{{ detailData.buyerPhone || '-' }}</div>
                <div><strong>邮箱：</strong>{{ detailData.buyerEmail || '-' }}</div>
              </div>
              <div class="detail-party">
                <h5 style="color:var(--color-accent);margin:0 0 var(--space-2) 0">供应商</h5>
                <div><strong>公司：</strong>{{ detailData.sellerName || '-' }}</div>
                <div><strong>地址：</strong>{{ detailData.sellerAddress || '-' }}</div>
                <div><strong>联系人：</strong>{{ detailData.sellerContact || '-' }}</div>
                <div><strong>电话：</strong>{{ detailData.sellerPhone || '-' }}</div>
                <div><strong>邮箱：</strong>{{ detailData.sellerEmail || '-' }}</div>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <div class="detail-section-header"><span>交易明细</span></div>
            <div class="table-container">
              <table class="data-table" style="font-size:var(--font-size-sm)">
                <thead>
                  <tr>
                    <th>#</th><th>日期</th><th>名称</th><th>料号</th><th>规格</th><th>单位</th><th>数量</th><th>单价</th><th>金额</th><th>备注</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="!detailData.items || detailData.items.length === 0">
                    <td colspan="10" style="text-align:center;color:var(--color-text-tertiary)">暂无明细</td>
                  </tr>
                  <tr v-for="(it, idx) in (detailData.items || [])" :key="idx">
                    <td>{{ idx + 1 }}</td>
                    <td>{{ it.date || '-' }}</td>
                    <td>{{ it.name }}</td>
                    <td class="cell-mono">{{ it.code }}</td>
                    <td>{{ it.spec || '-' }}</td>
                    <td>{{ it.unit || '-' }}</td>
                    <td class="cell-mono">{{ (it.qty || 0).toFixed(2) }}</td>
                    <td class="cell-mono">{{ (it.price || 0).toFixed(2) }}</td>
                    <td class="cell-mono" style="font-weight:600">¥{{ formatMoney(it.amount) }}</td>
                    <td>{{ it.remark || '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="detail-section">
            <div class="detail-section-header"><span>金额合计</span></div>
            <div class="detail-grid">
              <div class="detail-item"><span class="detail-label">小计</span><span class="detail-value">¥{{ formatMoney(detailData.subtotal) }}</span></div>
              <div class="detail-item"><span class="detail-label">税率</span><span class="detail-value">{{ detailData.taxRate || 0 }}%</span></div>
              <div class="detail-item"><span class="detail-label">税额</span><span class="detail-value">¥{{ formatMoney(detailData.taxAmount) }}</span></div>
              <div class="detail-item"><span class="detail-label">合计</span><span class="detail-value" style="color:var(--color-danger);font-weight:700;font-size:var(--font-size-lg)">¥{{ formatMoney(detailData.totalAmount) }}</span></div>
            </div>
            <div style="margin-top:var(--space-2)"><strong>大写：</strong><span style="color:var(--color-danger)">{{ detailData.totalChinese || statementStore.numberToChinese(detailData.totalAmount || 0) }}</span></div>
          </div>

          <div class="detail-section" v-if="discrepancy">
            <div class="detail-section-header"><span>对账差异分析</span></div>
            <div class="detail-grid">
              <div class="detail-item"><span class="detail-label">对账单小计</span><span class="detail-value">¥{{ formatMoney(discrepancy.statementSubtotal) }}</span></div>
              <div class="detail-item"><span class="detail-label">交易总额</span><span class="detail-value">¥{{ formatMoney(discrepancy.transactionTotal) }}</span></div>
              <div class="detail-item">
                <span class="detail-label">差异</span>
                <span class="detail-value" :style="{ color: discrepancy.isBalanced ? 'var(--color-success)' : 'var(--color-warning)', fontWeight: 600 }">
                  ¥{{ formatMoney(discrepancy.difference) }} {{ discrepancy.isBalanced ? '对账平衡' : '存在差异' }}
                </span>
              </div>
              <div class="detail-item"><span class="detail-label">匹配</span><span class="detail-value">交易 {{ discrepancy.matchedCount }} 条 · 明细 {{ discrepancy.itemCount }} 条</span></div>
            </div>
          </div>

          <div class="detail-section">
            <div class="detail-section-header"><span>付款条款</span></div>
            <div class="detail-grid">
              <div class="detail-item"><span class="detail-label">付款方式</span><span class="detail-value">{{ detailData.paymentMethod || '-' }}</span></div>
              <div class="detail-item"><span class="detail-label">付款期限</span><span class="detail-value">{{ detailData.paymentTerm || '-' }}</span></div>
              <div class="detail-item"><span class="detail-label">开户银行</span><span class="detail-value">{{ detailData.bankName || '-' }}</span></div>
              <div class="detail-item"><span class="detail-label">银行账号</span><span class="detail-value">{{ detailData.bankAccount || '-' }}</span></div>
              <div class="detail-item"><span class="detail-label">账户名称</span><span class="detail-value">{{ detailData.bankHolder || '-' }}</span></div>
              <div class="detail-item" v-if="detailData.status === 'confirmed'">
                <span class="detail-label">已付/应付</span>
                <span class="detail-value">¥{{ formatMoney(detailData.paidAmount) }} / ¥{{ formatMoney(detailData.totalAmount) }}</span>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <div class="detail-section-header"><span>确认签字</span></div>
            <div class="detail-parties">
              <div class="detail-party">
                <h5 style="margin:0 0 var(--space-2) 0">采购方确认</h5>
                <div><strong>签字：</strong>{{ detailData.buyerSign || '__________' }}</div>
                <div><strong>日期：</strong>{{ detailData.buyerSignDate || '____年__月__日' }}</div>
              </div>
              <div class="detail-party">
                <h5 style="margin:0 0 var(--space-2) 0">供应商确认</h5>
                <div><strong>签字：</strong>{{ detailData.sellerSign || '__________' }}</div>
                <div><strong>日期：</strong>{{ detailData.sellerSignDate || '____年__月__日' }}</div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="closeDetail">关闭</button>
          <button class="btn btn-outline" @click="handlePrint(detailData.id)">打印</button>
          <button
            v-if="detailData.status === 'pending' || detailData.status === 'draft'"
            class="btn btn-outline"
            @click="openEditor(detailData); closeDetail()"
          >编辑</button>
          <button
            v-if="detailData.status === 'pending'"
            class="btn btn-primary"
            @click="handleConfirm(detailData.id); closeDetail()"
          >确认</button>
          <button
            v-if="detailData.status === 'confirmed'"
            class="btn btn-primary"
            @click="handleMarkPaid(detailData); closeDetail()"
          >记录付款</button>
        </div>
      </div>
    </div>

    <div v-if="showPaidDialog" class="modal-overlay" @click.self="showPaidDialog = false">
      <div class="modal-content" style="max-width:400px">
        <div class="modal-header">
          <h3>记录付款</h3>
          <button class="btn btn-sm btn-outline" @click="showPaidDialog = false">关闭</button>
        </div>
        <div class="modal-body">
          <div style="margin-bottom:var(--space-3);padding:var(--space-3);background:var(--color-bg-primary);border-radius:var(--radius-md)">
            <div style="display:flex;justify-content:space-between;margin-bottom:var(--space-1)">
              <span>应付总额</span>
              <span class="cell-mono">¥{{ formatMoney(paidTarget.totalAmount) }}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:var(--space-1)">
              <span>已付金额</span>
              <span class="cell-mono">¥{{ formatMoney(paidTarget.paidAmount) }}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-weight:600">
              <span>剩余金额</span>
              <span class="cell-mono" style="color:var(--color-danger)">¥{{ formatMoney((paidTarget.totalAmount || 0) - (paidTarget.paidAmount || 0)) }}</span>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">本次付款金额</label>
            <input type="number" class="form-input" v-model.number="paidAmount" min="0.01" step="0.01">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="showPaidDialog = false">取消</button>
          <button class="btn btn-primary" @click="confirmPaid">确认付款</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, onUnmounted } from 'vue'
import { useStatementStore } from '@/stores/statement'
import { useCustomerStore } from '@/stores/customer'
import { useDataStore } from '@/stores/data'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

const statementStore = useStatementStore()
const customerStore = useCustomerStore()
const dataStore = useDataStore()

const currentView = ref('table')
const showEditor = ref(false)
const showDetail = ref(false)
const showPaidDialog = ref(false)
const editingId = ref(null)
const detailData = ref({})
const paidTarget = ref({})
const paidAmount = ref(0)
const discrepancy = ref(null)
const selectedIds = ref([])
const editorStep = ref(1)
const showExportMenu = ref(false)

const viewOptions = [
  { key: 'table', label: '表格' },
  { key: 'list', label: '列表' },
  { key: 'card', label: '卡片' }
]

const filters = reactive({
  search: '',
  period: '',
  status: ''
})

const editorData = reactive({
  statementNo: '',
  period: '',
  reconDate: '',
  contactPhone: '',
  preparer: 'admin',
  reviewer: '',
  buyerId: '',
  buyerName: '',
  buyerAddress: '',
  buyerContact: '',
  buyerPhone: '',
  buyerEmail: '',
  sellerId: '',
  sellerName: '',
  sellerAddress: '',
  sellerContact: '',
  sellerPhone: '',
  sellerEmail: '',
  taxRate: 13,
  paymentMethod: '',
  paymentTerm: '',
  bankName: '',
  bankAccount: '',
  bankHolder: ''
})

const editorItems = ref([])

const alerts = computed(() => statementStore.checkAlerts())

const filteredStatements = computed(() => {
  return statementStore.statements.filter(s => {
    if (filters.search) {
      const q = filters.search.toLowerCase()
      if (!(s.statementNo || '').toLowerCase().includes(q)) return false
    }
    if (filters.period && s.period !== filters.period) return false
    if (filters.status && s.status !== filters.status) return false
    return true
  })
})

const calcSubtotal = computed(() => {
  return editorItems.value.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0)
})

const calcTaxAmount = computed(() => {
  return calcSubtotal.value * (editorData.taxRate || 0) / 100
})

const calcTotalAmount = computed(() => {
  return calcSubtotal.value + calcTaxAmount.value
})

const calcTotalChinese = computed(() => {
  return statementStore.numberToChinese(calcTotalAmount.value)
})

function formatMoney(num) {
  if (num === undefined || num === null) return '0'
  return Number(num).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function getFirstItemPrice(s) {
  const items = s.items || []
  if (items.length === 0) return 0
  return items[0].price || 0
}

function getFirstItemQty(s) {
  const items = s.items || []
  if (items.length === 0) return 0
  return items[0].qty || 0
}

function formatPeriod(period) {
  if (!period) return '-'
  const parts = period.split('-')
  if (parts.length === 2) return parts[0] + ' 年 ' + parts[1] + ' 月'
  return period
}

function resetFilters() {
  filters.search = ''
  filters.period = ''
  filters.status = ''
}

function openEditor(data) {
  if (data && data.id) {
    editingId.value = data.id
    Object.keys(editorData).forEach(k => {
      editorData[k] = data[k] !== undefined ? data[k] : (typeof editorData[k] === 'number' ? 0 : '')
    })
    editorItems.value = (data.items || []).map(i => ({ ...i }))
  } else {
    editingId.value = null
    const now = new Date()
    const curPeriod = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
    const curDate = now.toISOString().split('T')[0]
    editorData.statementNo = statementStore.generateStatementNo(curPeriod)
    editorData.period = curPeriod
    editorData.reconDate = curDate
    editorData.contactPhone = ''
    editorData.preparer = 'admin'
    editorData.reviewer = ''
    editorData.buyerId = ''
    editorData.buyerName = ''
    editorData.buyerAddress = ''
    editorData.buyerContact = ''
    editorData.buyerPhone = ''
    editorData.buyerEmail = ''
    editorData.sellerId = ''
    editorData.sellerName = ''
    editorData.sellerAddress = ''
    editorData.sellerContact = ''
    editorData.sellerPhone = ''
    editorData.sellerEmail = ''
    editorData.taxRate = 13
    editorData.paymentMethod = ''
    editorData.paymentTerm = ''
    editorData.bankName = ''
    editorData.bankAccount = ''
    editorData.bankHolder = ''
    editorItems.value = []
  }
  editorStep.value = 1
  showEditor.value = true
}

function closeEditor() {
  showEditor.value = false
  editingId.value = null
  editorStep.value = 1
}

function prevStep() {
  if (editorStep.value > 1) {
    editorStep.value--
  }
}

function nextStep() {
  if (editorStep.value < 4) {
    editorStep.value++
  }
}

function onPeriodChange() {
  if (editorData.period && !editingId.value) {
    editorData.statementNo = statementStore.generateStatementNo(editorData.period)
  }
}

function onBuyerChange() {
  const c = customerStore.customers.find(c => c.id === editorData.buyerId)
  if (c) {
    editorData.buyerName = c.name || c.fullName || c.companyName
    editorData.buyerAddress = c.address || ''
    editorData.buyerContact = c.contact || ''
    editorData.buyerPhone = c.phone || ''
    editorData.buyerEmail = c.email || ''
  }
}

function onSellerChange() {
  const s = dataStore.suppliers.find(s => s.id === editorData.sellerId)
  if (s) {
    editorData.sellerName = s.name || s.shortName
    editorData.sellerAddress = s.address || ''
    editorData.sellerContact = s.contact || ''
    editorData.sellerPhone = s.phone || ''
    editorData.sellerEmail = s.email || ''
    editorData.bankName = s.bankName || ''
    editorData.bankAccount = s.bankAccount || ''
    editorData.bankHolder = s.bankHolder || s.name || ''
  }
}

function addItemRow() {
  const period = editorData.period
  let lastDay = ''
  if (period) {
    const parts = period.split('-')
    const yr = parseInt(parts[0])
    const mo = parseInt(parts[1])
    const dt = new Date(yr, mo, 0)
    lastDay = yr + '-' + String(mo).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0')
  }
  editorItems.value.push({
    date: lastDay,
    name: '',
    code: '',
    spec: '',
    unit: 'kg',
    qty: 0,
    price: 0,
    amount: 0,
    remark: ''
  })
}

function removeItemRow(idx) {
  editorItems.value.splice(idx, 1)
}

function clearItems() {
  if (editorItems.value.length > 0 && !confirm('确认清空所有明细？')) return
  editorItems.value = []
}

function calcItemAmount(idx) {
  const item = editorItems.value[idx]
  if (item) {
    item.amount = (parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0)
  }
}

function calcAmounts() {
  for (const item of editorItems.value) {
    item.amount = (parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0)
  }
}

function autoFetchTransactions() {
  if (!editorData.buyerId) { alert('请先选择采购方'); return }
  if (!editorData.period) { alert('请先选择账单期间'); return }
  const transactions = dataStore.transactions || []
  const parts = editorData.period.split('-')
  const yr = parseInt(parts[0])
  const mo = parseInt(parts[1])
  const lastDay = new Date(yr, mo, 0).getDate()
  const periodStart = editorData.period + '-01'
  const periodEnd = editorData.period + '-' + String(lastDay).padStart(2, '0')
  const matched = transactions.filter(t =>
    t.customerId === editorData.buyerId &&
    t.type !== 'collection' &&
    t.date >= periodStart &&
    t.date <= periodEnd &&
    (!t.reconciliationStatus || t.reconciliationStatus === '')
  )
  if (matched.length === 0) { alert('该期间无未对账交易记录'); return }
  const existingIds = new Set(editorItems.value.filter(i => i.sourceTransactionId).map(i => i.sourceTransactionId))
  let added = 0
  for (const t of matched) {
    if (!existingIds.has(t.id)) {
      editorItems.value.push({
        date: t.date || '',
        name: t.productName || t.description || '',
        code: t.productCode || '',
        spec: t.spec || '',
        unit: t.unit || 'kg',
        qty: t.quantity || 0,
        price: t.unitPrice || 0,
        amount: t.amount || 0,
        remark: '自动匹配·' + (t.transactionNo || ''),
        sourceTransactionId: t.id
      })
      added++
    }
  }
  alert('已自动拉取 ' + added + ' 条交易明细')
}

function collectData() {
  return {
    statementNo: editorData.statementNo,
    type: '月度对账单',
    period: editorData.period,
    reconDate: editorData.reconDate,
    preparer: editorData.preparer,
    reviewer: editorData.reviewer,
    contactPhone: editorData.contactPhone,
    buyerId: editorData.buyerId,
    buyerName: editorData.buyerName,
    buyerAddress: editorData.buyerAddress,
    buyerContact: editorData.buyerContact,
    buyerPhone: editorData.buyerPhone,
    buyerEmail: editorData.buyerEmail,
    sellerId: editorData.sellerId,
    sellerName: editorData.sellerName,
    sellerAddress: editorData.sellerAddress,
    sellerContact: editorData.sellerContact,
    sellerPhone: editorData.sellerPhone,
    sellerEmail: editorData.sellerEmail,
    items: JSON.parse(JSON.stringify(editorItems.value)),
    subtotal: calcSubtotal.value,
    taxRate: editorData.taxRate,
    taxAmount: calcTaxAmount.value,
    totalAmount: calcTotalAmount.value,
    totalChinese: calcTotalChinese.value,
    paymentMethod: editorData.paymentMethod,
    paymentTerm: editorData.paymentTerm,
    bankName: editorData.bankName,
    bankAccount: editorData.bankAccount,
    bankHolder: editorData.bankHolder
  }
}

function validateData(data) {
  return []
}

function saveDraft() {
  const data = collectData()
  if (editingId.value) {
    statementStore.updateStatement(editingId.value, { ...data, status: 'draft' })
  } else {
    statementStore.addStatement({ ...data, status: 'draft' })
  }
  closeEditor()
}

function submitStatement() {
  const data = collectData()
  const errors = validateData(data)
  if (errors.length > 0) {
    alert(errors[0])
    return
  }
  if (editingId.value) {
    statementStore.updateStatement(editingId.value, { ...data, status: 'pending' })
  } else {
    statementStore.addStatement(data)
  }
  closeEditor()
}

function viewDetail(id) {
  const stmt = statementStore.getById(id)
  if (!stmt) return
  detailData.value = { ...stmt }
  discrepancy.value = statementStore.analyzeDiscrepancies(id, dataStore.transactions)
  showDetail.value = true
}

function closeDetail() {
  showDetail.value = false
  discrepancy.value = null
}

function handleConfirm(id) {
  if (confirm('确认此对账单？')) {
    statementStore.confirmStatement(id)
  }
}

function handleVoid(id) {
  if (confirm('确认作废此对账单？')) {
    statementStore.voidStatement(id)
  }
}

function handleMarkPaid(stmt) {
  paidTarget.value = stmt
  paidAmount.value = (stmt.totalAmount || 0) - (stmt.paidAmount || 0)
  showPaidDialog.value = true
}

function confirmPaid() {
  if (!paidAmount.value || paidAmount.value <= 0) {
    alert('请输入有效的付款金额')
    return
  }
  const ok = statementStore.markAsPaid(paidTarget.value.id, paidAmount.value)
  if (!ok) {
    alert('付款金额超出应付总额')
    return
  }
  showPaidDialog.value = false
}

function handleReopen(id) {
  if (confirm('确认重新打开此对账单？')) {
    statementStore.reopenStatement(id)
  }
}

function handleDelete(id) {
  if (confirm('确认删除此对账单？删除后不可恢复。')) {
    statementStore.deleteStatement(id)
  }
}

function handlePrint(id) {
  const stmt = statementStore.getById(id)
  if (!stmt) return
  const items = stmt.items || []
  let itemsHtml = items.map((it, idx) =>
    `<tr><td>${idx + 1}</td><td>${it.date || ''}</td><td>${it.name || ''}</td><td>${it.code || ''}</td><td>${it.spec || ''}</td><td>${it.unit || ''}</td><td style="text-align:right">${(it.qty || 0).toFixed(2)}</td><td style="text-align:right">${(it.price || 0).toFixed(2)}</td><td style="text-align:right;font-weight:600">${(it.amount || 0).toFixed(2)}</td></tr>`
  ).join('')
  const printWin = window.open('', '_blank')
  printWin.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>对账单打印</title><style>body{font-family:"Microsoft YaHei",sans-serif;padding:20px;color:#333;font-size:12px}table{width:100%;border-collapse:collapse;margin:10px 0}th,td{border:1px solid #999;padding:4px 6px;text-align:left;font-size:11px}th{background:#f0f0f0;font-weight:600}.section{margin-bottom:16px}.section-title{font-size:14px;font-weight:700;margin-bottom:8px;border-bottom:1px solid #ddd;padding-bottom:4px}.parties{display:grid;grid-template-columns:1fr 1fr;gap:16px}.amounts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}@media print{body{padding:0}}</style></head><body>
    <h2 style="text-align:center">对账单</h2>
    <div class="section"><div class="section-title">账单信息</div>
    <table><tr><td><strong>编号：</strong>${stmt.statementNo}</td><td><strong>期间：</strong>${formatPeriod(stmt.period)}</td></tr>
    <tr><td><strong>采购方：</strong>${stmt.buyerName || '-'}</td><td><strong>供应商：</strong>${stmt.sellerName || '-'}</td></tr></table></div>
    <div class="section"><div class="section-title">交易明细</div>
    <table><thead><tr><th>#</th><th>日期</th><th>名称</th><th>料号</th><th>规格</th><th>单位</th><th>数量</th><th>单价</th><th>金额</th></tr></thead><tbody>${itemsHtml}</tbody></table></div>
    <div class="section"><div class="section-title">金额合计</div>
    <div class="amounts"><div><strong>小计：</strong>¥${(stmt.subtotal || 0).toFixed(2)}</div><div><strong>税率：</strong>${stmt.taxRate || 0}%</div>
    <div><strong>税额：</strong>¥${(stmt.taxAmount || 0).toFixed(2)}</div><div><strong style="color:red">合计：¥${(stmt.totalAmount || 0).toFixed(2)}</strong></div></div></div>
    <div style="text-align:center;margin-top:20px;font-size:10px;color:#999">苏州冠久标准化对账单 · 打印时间：${new Date().toLocaleString()}</div>
  </body></html>`)
  printWin.document.close()
  setTimeout(() => printWin.print(), 500)
}

function exportCSV() {
  const data = filteredStatements.value
  if (data.length === 0) { alert('暂无数据可导出'); return }
  let csv = '对账单号,日期,采购方,供应商,单价,数量,总金额,状态,创建日期\n'
  for (const s of data) {
    csv += `"${s.statementNo}","${s.reconDate || ''}","${s.buyerName || ''}","${s.sellerName || ''}",${getFirstItemPrice(s)},${getFirstItemQty(s)},${s.totalAmount || 0},"${statementStore.statusLabels[s.status] || s.status}","${s.createdAt || ''}"\n`
  }
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = '对账单_' + new Date().toISOString().split('T')[0] + '.csv'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function exportXLSX() {
  const data = filteredStatements.value
  if (data.length === 0) { alert('暂无数据可导出'); return }
  const rows = data.map(s => ({
    '对账单号': s.statementNo,
    '日期': s.reconDate || '-',
    '采购方': s.buyerName || '-',
    '供应商': s.sellerName || '-',
    '单价': getFirstItemPrice(s),
    '数量': getFirstItemQty(s),
    '总金额': s.totalAmount || 0,
    '状态': statementStore.statusLabels[s.status] || s.status,
    '创建日期': s.createdAt || '-'
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '对账单')
  ws['!cols'] = [
    { wch: 18 }, { wch: 12 }, { wch: 16 }, { wch: 16 },
    { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 14 }
  ]
  XLSX.writeFile(wb, '对账单_' + new Date().toISOString().split('T')[0] + '.xlsx')
}

function exportPDF() {
  const data = filteredStatements.value
  if (data.length === 0) { alert('暂无数据可导出'); return }
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  doc.setFontSize(16)
  doc.text('对账单列表', 14, 15)
  doc.setFontSize(10)
  doc.text('导出时间: ' + new Date().toLocaleString('zh-CN'), 14, 22)
  const body = data.map(s => [
    s.statementNo,
    s.reconDate || '-',
    s.buyerName || '-',
    s.sellerName || '-',
    '¥' + formatMoney(getFirstItemPrice(s)),
    getFirstItemQty(s),
    '¥' + formatMoney(s.totalAmount),
    statementStore.statusLabels[s.status] || s.status,
    s.createdAt || '-'
  ])
  doc.autoTable({
    head: [['对账单号', '日期', '采购方', '供应商', '单价', '数量', '总金额', '状态', '创建日期']],
    body: body,
    startY: 28,
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    theme: 'grid'
  })
  doc.save('对账单_' + new Date().toISOString().split('T')[0] + '.pdf')
}

function handleBatchDelete() {
  if (selectedIds.value.length === 0) return
  if (!confirm(`确定删除选中的 ${selectedIds.value.length} 条对账单？`)) return
  for (const id of selectedIds.value) {
    statementStore.deleteStatement(id)
  }
  selectedIds.value = []
}

function handleBatchPrint() {
  if (selectedIds.value.length === 0) return
  const items = statementStore.statements.filter(s => selectedIds.value.includes(s.id))
  const printContent = items.map(s => `
    <div style="page-break-after:always;margin-bottom:20px;padding:20px;border:1px solid #ccc">
      <h2 style="text-align:center">对账单 - ${s.statementNo}</h2>
      <p>期间: ${formatPeriod(s.period)}</p>
      <p>采购方: ${s.buyerName || '-'}</p>
      <p>供应商: ${s.sellerName || '-'}</p>
      <p>总金额: ¥${s.totalAmount || 0}</p>
      <p>已付金额: ¥${s.paidAmount || 0}</p>
      <p>状态: ${statementStore.statusLabels[s.status] || s.status}</p>
    </div>
  `).join('')
  const win = window.open('', '_blank')
  win.document.write(`<html><head><title>批量打印对账单</title></head><body>${printContent}</body></html>`)
  win.document.close()
  win.print()
}

function closeExportMenu(e) {
  if (!e.target.closest('.export-dropdown-wrapper')) {
    showExportMenu.value = false
  }
}

onMounted(() => {
  customerStore.initSeedData()
  dataStore.initSeedData()
  statementStore.initSeedData()
  document.addEventListener('click', closeExportMenu)
})

onUnmounted(() => {
  document.removeEventListener('click', closeExportMenu)
})
</script>

<style scoped>
.statement-page {
  max-width: 1600px;
  margin: 0 auto;
}
.stats-grid-5 {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}
.page-header-actions {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  flex-wrap: wrap;
}
.view-toggle {
  display: flex;
  gap: 2px;
}
.view-toggle .btn.active {
  background: var(--color-accent-subtle);
  color: var(--color-accent);
  border-color: var(--color-accent);
}
.alert-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  margin-bottom: var(--space-2);
  border-radius: var(--radius-md);
}
.alert-item.alert-high {
  background: var(--color-danger-subtle, rgba(239,68,68,0.1));
  border-left: 3px solid var(--color-danger);
}
.alert-item.alert-medium {
  background: var(--color-warning-subtle, rgba(245,158,11,0.1));
  border-left: 3px solid var(--color-warning);
}
.alert-icon { font-size: var(--font-size-lg); }
.alert-message { flex: 1; font-size: var(--font-size-sm); }
.list-view {
  padding: var(--space-3);
}
.list-item {
  padding: var(--space-3);
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  transition: background var(--transition-fast);
}
.list-item:hover { background: var(--color-surface-hover); }
.list-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-1);
}
.list-item-title {
  font-weight: 600;
  color: var(--color-accent);
  font-family: var(--font-mono);
}
.list-item-meta {
  display: flex;
  gap: var(--space-4);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.card-view {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);
  padding: var(--space-3);
}
.statement-card {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.statement-card:hover {
  border-color: var(--color-accent);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
}
.card-title {
  font-weight: 600;
  color: var(--color-accent);
  font-family: var(--font-mono);
}
.card-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.card-field {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-sm);
}
.card-label {
  color: var(--color-text-tertiary);
}
.card-actions {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
}
.editor-section {
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}
.editor-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}
.editor-section-title {
  font-size: var(--font-size-md);
  font-weight: 600;
  margin: 0 0 var(--space-3) 0;
  color: var(--color-accent);
}
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}
.form-input-xs {
  padding: 2px 4px;
  font-size: var(--font-size-xs);
}
.wizard-steps {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  margin-bottom: var(--space-4);
  padding: var(--space-3) 0;
}
.wizard-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.wizard-step .step-number {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-sm);
  font-weight: 600;
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  color: var(--color-text-tertiary);
  transition: all 0.2s;
}
.wizard-step .step-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  transition: all 0.2s;
}
.wizard-step.active .step-number {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: #fff;
}
.wizard-step.active .step-label {
  color: var(--color-accent);
  font-weight: 600;
}
.wizard-step.completed .step-number {
  background: var(--color-success);
  border-color: var(--color-success);
  color: #fff;
}
.wizard-step.completed .step-label {
  color: var(--color-success);
}
.wizard-step-line {
  flex: 1;
  height: 2px;
  background: var(--color-border);
  max-width: 60px;
  margin: 0 var(--space-2);
  transition: all 0.2s;
}
.wizard-step-line.completed {
  background: var(--color-success);
}
.wizard-content {
  animation: fadeIn 0.2s ease;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
.export-dropdown-wrapper {
  position: relative;
}
.export-dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  z-index: 100;
  min-width: 160px;
  overflow: hidden;
}
.export-dropdown-item {
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}
.export-dropdown-item:hover {
  background: var(--color-surface-hover);
}
.detail-section {
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}
.detail-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}
.detail-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--font-size-md);
  font-weight: 600;
  margin-bottom: var(--space-3);
  color: var(--color-accent);
}
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}
.detail-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.detail-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}
.detail-value {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}
.detail-parties {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}
.detail-party {
  font-size: var(--font-size-sm);
}
.detail-party div {
  margin-bottom: var(--space-1);
}
@media (max-width: 1024px) {
  .stats-grid-5 { grid-template-columns: repeat(3, 1fr); }
  .detail-grid { grid-template-columns: 1fr; }
  .detail-parties { grid-template-columns: 1fr; }
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: auto;
}
.data-table th,
.data-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}
.data-table th {
  font-weight: 600;
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.data-table td {
  font-size: var(--font-size-sm);
}
.data-table tbody tr:hover {
  background: var(--color-surface-hover);
}
@media (max-width: 640px) {
  .stats-grid-5 { grid-template-columns: repeat(2, 1fr); }
  .form-row { grid-template-columns: 1fr; }
}
</style>
