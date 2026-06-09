import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { mergeArrays } from '@/utils/conflictResolver'
import { useSessionStore } from './session'
import { generateId } from '@/utils/uid'
import { useInventoryStore } from './inventory'
import { useQuotationStore } from './quotation'
import { useSyncEngine } from '@/utils/syncEngine'
import { safeGetItem, safeSetItem, safeGetJSON, safeSetJSON } from '@/utils/storage'

const STORAGE_KEY = 'gj_erp_todos'
const INIT_KEY = 'gj_erp_todos_initialized'
const DELETED_AUTO_KEY = 'gj_erp_todos_deletedAuto'

function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.warn('[TodoStore] 加载失败:', e)
  }
  return []
}

function loadDeletedAutoIds() {
  try {
    const raw = localStorage.getItem(DELETED_AUTO_KEY)
    if (raw) return new Set(JSON.parse(raw))
  } catch (e) {}
  return new Set()
}

function persistDeletedAutoIds(ids) {
  try {
    localStorage.setItem(DELETED_AUTO_KEY, JSON.stringify([...ids]))
  } catch (e) {}
}

function persist(todos) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      console.error('[todo] localStorage容量不足，数据可能丢失！')
    }
  }
}

export const useTodoStore = defineStore('todo', () => {
  /* 获取当前用户标识 */
  function getCurrentUser() {
    try {
      const sessionStore = useSessionStore()
      return sessionStore.roleName || '未知用户'
    } catch (e) {
      return '未知用户'
    }
  }

  const todos = ref(loadTodos())
  const deletedAutoIds = ref(loadDeletedAutoIds())

  const today = computed(() => new Date().toISOString().split('T')[0])

  const allTodos = computed(() => {
    const manual = todos.value.filter(t => !t.auto && !t.autoCompletedId)
    const auto = generateAutoTodos()
    const filteredAuto = auto.filter(at => !deletedAutoIds.value.has(at.id))
    return [...manual, ...filteredAuto]
  })

  const stats = computed(() => {
    const all = allTodos.value
    const t = today.value
    const pending = all.filter(t => t.status !== 'completed')
    const completed = all.filter(t => t.status === 'completed')
    const overdue = pending.filter(t => t.dueDate && t.dueDate < t)
    return {
      total: all.length,
      pending: pending.length,
      completed: completed.length,
      overdue: overdue.length
    }
  })

  const allTags = computed(() => {
    const tags = new Set()
    todos.value.forEach(t => { if (t.tag) tags.add(t.tag) })
    return [...tags].sort()
  })

  function generateAutoTodos() {
    const result = []
    const now = new Date()
    const t = today.value

    const inv = useInventoryStore().inventory
    inv.forEach(item => {
      if (item.quantity <= (item.minStock || item.safetyStock || 10)) {
        const isCritical = item.quantity <= (item.minStock || item.safetyStock || 10) * 0.5
        result.push({
          id: 'auto_inv_' + item.id,
          title: '补货 ' + item.name + '（库存不足）',
          type: 'stock',
          priority: isCritical ? 'high' : 'medium',
          source: 'inventory',
          sourceId: item.id,
          status: 'pending',
          dueDate: '',
          createdAt: t,
          completedAt: null,
          notes: '库存' + item.quantity + ' / 安全' + (item.minStock || item.safetyStock || 10),
          auto: true
        })
      }
    })

    const quo = useQuotationStore().quotations
    quo.forEach(q => {
      if (q.status === 'pending') {
        result.push({
          id: 'auto_quo_pending_' + q.id,
          title: '审核报价单 ' + (q.quotationNo || q.quoteNo || ''),
          type: 'review',
          priority: 'high',
          source: 'quotations',
          sourceId: q.id,
          status: 'pending',
          dueDate: q.expiryDate || '',
          createdAt: q.createdAt || q.date || '',
          completedAt: null,
          notes: (q.customerName || '') + ' ¥' + ((q.amount || q.total || 0)).toLocaleString(),
          auto: true
        })
      }
    })

    return result
  }

  function addTodo(todo) {
    const newTodo = {
      id: generateId('t'),
      title: '',
      type: 'custom',
      priority: 'medium',
      source: '',
      sourceId: '',
      status: 'pending',
      dueDate: '',
      startDate: '',
      createdBy: getCurrentUser(),
      createdAt: new Date().toISOString(),
      completedAt: null,
      notes: '',
      tag: '',
      reminder: '不提醒',
      repeat: 'none',
      progress: 0,
      remark: '',
      subtasks: [],
      ...todo
    }
    todos.value.push(newTodo)
    persist(todos.value)
    return newTodo
  }

  function updateTodo(id, updates) {
    const idx = todos.value.findIndex(t => t.id === id)
    if (idx !== -1) {
      todos.value[idx] = { ...todos.value[idx], ...updates }
      persist(todos.value)
    }
  }

  function toggleTodo(id, isAuto = false) {
    if (isAuto) {
      if (deletedAutoIds.value.has(id)) {
        deletedAutoIds.value.delete(id)
        persistDeletedAutoIds(deletedAutoIds.value)
        return { action: 'restored', id }
      }
      deletedAutoIds.value.add(id)
      persistDeletedAutoIds(deletedAutoIds.value)
      return { action: 'completed', id }
    }

    const todo = todos.value.find(t => t.id === id)
    if (todo) {
      if (todo.status === 'completed') {
        todo.status = 'pending'
        todo.completedAt = null
      } else {
        todo.status = 'completed'
        todo.completedAt = new Date().toISOString()
        /* 重复任务完成时，自动创建下一条待办 */
        if (todo.repeat && todo.repeat !== 'none') {
          const nextDue = _calculateNextDueDate(todo.dueDate, todo.repeat)
          if (nextDue) {
            addTodo({
              ...todo,
              id: undefined,
              status: 'pending',
              dueDate: nextDue,
              startDate: '',
              completedAt: null,
              createdAt: new Date().toISOString(),
              progress: 0,
              subtasks: (todo.subtasks || []).map(s => ({ ...s, completed: false }))
            })
          }
        }
      }
      persist(todos.value)
      return { action: todo.status === 'completed' ? 'completed' : 'restored', id }
    }
    return null
  }

  function _calculateNextDueDate(currentDate, repeat) {
    if (!currentDate || !repeat || repeat === 'none') return null
    const d = new Date(currentDate)
    switch (repeat) {
      case 'daily': d.setDate(d.getDate() + 1); break
      case 'weekly': d.setDate(d.getDate() + 7); break
      case 'monthly': d.setMonth(d.getMonth() + 1); break
      case 'yearly': d.setFullYear(d.getFullYear() + 1); break
      default: return null
    }
    return d.toISOString().split('T')[0]
  }

  function deleteTodo(id) {
    const todo = todos.value.find(t => t.id === id)
    if (todo) {
      todos.value = todos.value.filter(t => t.id !== id)
      const syncEngine = useSyncEngine()
      syncEngine.recordDeletedId('todos', id)
      persist(todos.value)
    } else {
      deletedAutoIds.value.add(id)
      persistDeletedAutoIds(deletedAutoIds.value)
    }
  }

  function batchComplete(ids) {
    const now = new Date().toISOString()
    ids.forEach(id => {
      const todo = todos.value.find(t => t.id === id)
      if (todo) {
        if (todo.status !== 'completed') {
          todo.status = 'completed'
          todo.completedAt = now
        }
      } else {
        deletedAutoIds.value.add(id)
      }
    })
    persist(todos.value)
    persistDeletedAutoIds(deletedAutoIds.value)
  }

  function batchDelete(ids) {
    ids.forEach(id => {
      const todo = todos.value.find(t => t.id === id)
      if (todo) {
        todo._deleted = true
      } else {
        deletedAutoIds.value.add(id)
      }
    })
    todos.value = todos.value.filter(t => !t._deleted)
    const syncEngine = useSyncEngine()
    syncEngine.recordDeletedIds('todos', ids)
    persist(todos.value)
    persistDeletedAutoIds(deletedAutoIds.value)
  }

  function clearCompleted() {
    todos.value = todos.value.filter(t => t.status !== 'completed')
    persist(todos.value)
  }

  function completeAll() {
    const now = new Date().toISOString()
    todos.value.forEach(t => {
      if (t.status !== 'completed') {
        t.status = 'completed'
        t.completedAt = now
      }
    })
    const autoTodos = generateAutoTodos()
    autoTodos.forEach(at => {
      deletedAutoIds.value.add(at.id)
    })
    persist(todos.value)
    persistDeletedAutoIds(deletedAutoIds.value)
  }

  function toggleSubtask(todoId, subtaskId) {
    const todo = todos.value.find(t => t.id === todoId)
    if (todo && todo.subtasks) {
      const sub = todo.subtasks.find(s => s.id === subtaskId)
      if (sub) {
        sub.completed = !sub.completed
        const done = todo.subtasks.filter(s => s.completed).length
        todo.progress = Math.round((done / todo.subtasks.length) * 100)
        if (todo.progress === 100) {
          todo.status = 'completed'
          todo.completedAt = new Date().toISOString()
        }
        persist(todos.value)
      }
    }
  }

  function initSeedData() {
    if (safeGetItem(INIT_KEY)) return
    const t = today.value
    const seed = [
      { id: 't1', title: '跟进上海贸易合同续签', type: 'followup', priority: 'high', status: 'pending', dueDate: '2026-06-05', startDate: '2026-05-28', createdAt: '2026-05-28T09:00:00Z', notes: '合同即将到期，需尽快沟通续签事宜', tag: '商务', reminder: '提前3天', progress: 30, remark: '重要客户', subtasks: [{ id: 's1', title: '准备续签方案', completed: true }, { id: 's2', title: '联系客户确认', completed: false }, { id: 's3', title: '法务审核', completed: false }] },
      { id: 't2', title: '整理广州进出口对账单', type: 'custom', priority: 'medium', status: 'pending', dueDate: '2026-06-10', startDate: '', createdAt: '2026-05-29T10:00:00Z', notes: '5月份对账数据整理', tag: '财务', reminder: '提前1天', progress: 0, remark: '' },
      { id: 't3', title: '深圳智造报价单审核', type: 'review', priority: 'high', status: 'pending', dueDate: '2026-05-30', startDate: '2026-05-27', createdAt: '2026-05-27T14:00:00Z', notes: '客户催促尽快回复', tag: '商务', reminder: '提前1天', progress: 60, remark: '加急处理' },
      { id: 't4', title: '月度库存盘点', type: 'stock', priority: 'low', status: 'pending', dueDate: '2026-06-30', startDate: '2026-06-25', createdAt: '2026-05-30T08:00:00Z', notes: '全仓盘点', tag: '运维', reminder: '提前1周', progress: 0, remark: '' },
      { id: 't5', title: '回款催收-武汉钢贸', type: 'payment', priority: 'high', status: 'pending', dueDate: '2026-05-25', startDate: '2026-05-20', createdAt: '2026-05-20T11:00:00Z', notes: '逾期回款需催收', tag: '财务', reminder: '不提醒', progress: 10, remark: '客户回款慢' },
      { id: 't6', title: '新员工ERP系统培训', type: 'custom', priority: 'medium', status: 'completed', dueDate: '2026-05-28', startDate: '2026-05-26', createdAt: '2026-05-25T09:00:00Z', notes: '系统操作培训已完成', tag: '培训', reminder: '不提醒', progress: 100, completedAt: '2026-05-28T16:00:00Z', remark: '' },
      { id: 't7', title: '供应商资质审核-浙江化工', type: 'approve', priority: 'medium', status: 'pending', dueDate: '2026-06-08', startDate: '', createdAt: '2026-05-29T15:00:00Z', notes: '新供应商准入审核', tag: '商务', reminder: '提前2天', progress: 20, remark: '' },
      { id: 't8', title: '每日数据备份检查', type: 'custom', priority: 'low', status: 'pending', dueDate: '2026-05-31', startDate: '', createdAt: '2026-05-30T08:00:00Z', notes: '检查自动备份是否正常', tag: '运维', reminder: '不提醒', progress: 0, repeat: 'daily', remark: '' }
    ]
    todos.value = seed
    persist(todos.value)
    safeSetItem(INIT_KEY, '1')
  }

  function mergeRemoteItems(items) {
    if (!Array.isArray(items)) return
    const merged = mergeArrays(todos.value, items, 'id')
    todos.value = merged
    persist(todos.value)
  }

  function replaceData(newData) {
    todos.value = newData
    persist(todos.value)
  }

  return {
    todos, allTodos, stats, allTags, today,
    addTodo, updateTodo, toggleTodo, deleteTodo,
    batchComplete, batchDelete, clearCompleted, completeAll,
    toggleSubtask, initSeedData,
    replaceData, mergeRemoteItems,
    persist
  }
})
