export function useInboundActions(ctx) {
  const {
    inventoryStore,
    inboundForm,
    inboundFormItems,
    inboundErrors,
    editingInboundId,
    copySuccessMsg,
    inboundSelectedIds,
    inboundSelectAll,
    closeInboundWizard,
    showConfirmDialog
  } = ctx

  function handleSubmitInbound() {
    const supplier = inventoryStore.lookupSupplier(inboundForm.counterpartyId)
    const result = inventoryStore.submitInboundOrder({
      ...inboundForm,
      id: editingInboundId.value || undefined,
      counterpartyName: supplier ? supplier.shortName || supplier.name : inboundForm.counterpartyName,
      supplierCode: supplier ? supplier.supplierCode : inboundForm.supplierCode,
      _items: inboundFormItems.value
    })
    if (result.success) {
      inventoryStore.addAuditLog(
        'create',
        'inbound',
        (editingInboundId.value ? '编辑并提交入库单: ' : '创建入库单: ') + (result.order ? result.order.orderNo : ''),
        { orderNo: result.order ? result.order.orderNo : '' }
      )
      closeInboundWizard()
    } else {
      inboundErrors.value = result.errors || ['提交失败']
    }
  }

  function handleSaveInboundDraft() {
    const supplier = inventoryStore.lookupSupplier(inboundForm.counterpartyId)
    const result = inventoryStore.saveInboundDraft({
      ...inboundForm,
      id: editingInboundId.value || undefined,
      counterpartyName: supplier ? supplier.shortName || supplier.name : inboundForm.counterpartyName,
      supplierCode: supplier ? supplier.supplierCode : inboundForm.supplierCode,
      _items: inboundFormItems.value
    })
    if (result && result.success) {
      inventoryStore.addAuditLog('save', 'inbound', '保存入库草稿: ' + (result.order ? result.order.orderNo : ''))
      closeInboundWizard()
    } else {
      inboundErrors.value = (result && result.errors) || ['草稿保存失败，请检查表单数据']
    }
  }

  function handleChangeInboundStatus(orderId, newStatus) {
    const order = inventoryStore.inboundOrders.find((o) => o.id === orderId)
    inventoryStore.changeInboundStatus(orderId, newStatus)
    inventoryStore.addAuditLog(
      'status_change',
      'inbound',
      '入库单状态变更: ' +
        (order ? order.orderNo : orderId) +
        ' → ' +
        (inventoryStore.INBOUND_STATUS_LABELS[newStatus] || newStatus)
    )
  }

  function handleConfirmInbound(orderId) {
    const result = inventoryStore.confirmInbound(orderId)
    if (result.success) {
      inventoryStore.addAuditLog('status_change', 'inbound', '入库单已确认入库', { orderId, sensitive: true })
    } else {
      inboundErrors.value = [result.error || '确认入库失败']
    }
  }

  function handleReverseInbound(orderId) {
    showConfirmDialog('冲销入库单', '确认冲销该入库单？库存将相应扣回，此操作不可撤销。', () => {
      const result = inventoryStore.reverseInboundOrder(orderId)
      if (result.success) {
        inventoryStore.addAuditLog(
          'reverse',
          'inbound',
          '冲销入库单: ' + (result.reverseOrder ? result.reverseOrder.orderNo : '')
        )
      } else {
        inboundErrors.value = [result.error || '冲销失败']
      }
    })
  }

  function handleDeleteInbound(id) {
    const order = inventoryStore.inboundOrders.find((o) => o.id === id)
    showConfirmDialog('确认删除', '确认删除该入库单？', () => {
      inventoryStore.deleteInboundOrder(id)
      inventoryStore.addAuditLog('delete', 'inbound', '删除入库单: ' + (order ? order.orderNo : id))
    })
  }

  function handleBatchDeleteInbound() {
    if (inboundSelectedIds.value.length === 0) {
      inboundErrors.value = ['请先勾选要删除的入库记录']
      return
    }
    showConfirmDialog(
      '批量删除',
      '确认删除选中的 ' + inboundSelectedIds.value.length + ' 条入库记录？此操作不可撤销。',
      () => {
        const count = inventoryStore.batchDeleteInboundOrders(inboundSelectedIds.value)
        inboundSelectedIds.value = []
        inventoryStore.addAuditLog('delete', 'inbound', '批量删除入库记录 ' + count + ' 条')
      }
    )
  }

  function handleBatchApproveInbound() {
    const pendingIds = inboundSelectedIds.value.filter((id) => {
      const o = inventoryStore.inboundOrders.find((ord) => ord.id === id)
      return o && o.status === 'pending'
    })
    if (pendingIds.length === 0) {
      inboundErrors.value = ['请选择待审核的入库单']
      return
    }
    showConfirmDialog('批量审批', '确认审批选中的入库单？', () => {
      const count = inventoryStore.batchApproveInbound(pendingIds)
      inboundSelectedIds.value = []
      inboundSelectAll.value = false
      inventoryStore.addAuditLog('batchApprove', 'inbound', '批量审批入库单: ' + count + '条')
    })
  }

  function handleBatchConfirmInbound() {
    const inspectingIds = inboundSelectedIds.value.filter((id) => {
      const o = inventoryStore.inboundOrders.find((ord) => ord.id === id)
      return o && o.status === 'inspecting'
    })
    if (inspectingIds.length === 0) {
      inboundErrors.value = ['请选择质检中的入库单']
      return
    }
    showConfirmDialog('批量确认入库', '确认入库选中的记录？库存将相应增加。', () => {
      const count = inventoryStore.batchConfirmInbound(inspectingIds)
      inboundSelectedIds.value = []
      inboundSelectAll.value = false
      inventoryStore.addAuditLog('batchConfirm', 'inbound', '批量确认入库: ' + count + '条')
    })
  }

  function handleCopyInbound(id) {
    const newOrder = inventoryStore.copyInboundOrder(id)
    if (newOrder) {
      copySuccessMsg.value = '已复制入库单: ' + newOrder.orderNo
      setTimeout(() => {
        copySuccessMsg.value = ''
      }, 3000)
    }
  }

  function handleRestoreFromRecycleBin(id) {
    inventoryStore.restoreFromRecycleBin(id)
  }

  function handlePermanentDeleteFromRecycleBin(id) {
    showConfirmDialog('永久删除', '确认永久删除？此操作不可恢复。', () => {
      inventoryStore.permanentDeleteFromRecycleBin(id)
    })
  }

  function handleEmptyRecycleBin() {
    showConfirmDialog('清空回收站', '确认清空回收站？所有数据将永久删除，此操作不可恢复。', () => {
      inventoryStore.emptyRecycleBin()
    })
  }

  return {
    handleSubmitInbound,
    handleSaveInboundDraft,
    handleChangeInboundStatus,
    handleConfirmInbound,
    handleReverseInbound,
    handleDeleteInbound,
    handleBatchDeleteInbound,
    handleBatchApproveInbound,
    handleBatchConfirmInbound,
    handleCopyInbound,
    handleRestoreFromRecycleBin,
    handlePermanentDeleteFromRecycleBin,
    handleEmptyRecycleBin
  }
}
