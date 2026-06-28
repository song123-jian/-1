import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { mergeArrays } from '@/utils/conflictResolver'
import { useSessionStore } from './session'
import { generateId } from '@/utils/uid'
import { useInventoryStore } from '@/modules/warehouse/stores/inventory'
import { useQuotationStore } from '@/modules/sales/stores/quotation'
import { useWorkflowStore } from '@/modules/system/stores/workflow'
import { useNotificationStore, NotificationType } from '@/stores/notification'
import { useSyncEngine } from '@/utils/syncEngine'
import { safeGetItem, safeSetItem } from '@/utils/storage'
import { toLocalDateStr } from '@/utils/format'

const STORAGE_KEY = 'gj_erp_todos'
const INIT_KEY = 'gj_erp_todos_initialized'
const DELETED_AUTO_KEY = 'gj_erp_todos_deletedAuto'
const TOMBSTONE_KEY = 'gj_erp_todos_tombstones'
const MAX_STORAGE_TODOS = 500

const TODO_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed'
}

function getCurrentUser() {
  try {
    const sessionStore = useSessionStore()
    return sessionStore.roleName || '鏈煡鐢ㄦ埛'
  } catch (e) {
    return '鏈煡鐢ㄦ埛'
  }
}

function normalizeSubtask(subtask, index = 0) {
  return {
    id: subtask?.id || `sub_${Date.now()}_${index}`,
    title: subtask?.title || '',
    completed: Boolean(subtask?.completed)
  }
}

function normalizeTodo(todo = {}) {
  const subtasks = Array.isArray(todo.subtasks) ? todo.subtasks.map((sub, index) => normalizeSubtask(sub, index)) : []
  const status = todo.status === TODO_STATUS.COMPLETED ? TODO_STATUS.COMPLETED : TODO_STATUS.PENDING
  const priority = ['high', 'medium', 'low'].includes(todo.priority) ? todo.priority : 'medium'

  return {
    id: todo.id || generateId('t'),
    title: todo.title || '',
    type: todo.type || 'custom',
    priority,
    source: todo.source || '',
    sourceId: todo.sourceId || '',
    status,
    dueDate: todo.dueDate || '',
    startDate: todo.startDate || '',
    createdBy: todo.createdBy || getCurrentUser(),
    createdAt: todo.createdAt || new Date().toISOString(),
    completedAt: todo.completedAt || null,
    updatedAt: todo.updatedAt || todo.createdAt || new Date().toISOString(),
    notes: todo.notes || '',
    tag: todo.tag || '',
    reminder: todo.reminder || '不提醒',
    repeat: todo.repeat || 'none',
    progress: Number.isFinite(Number(todo.progress)) ? Number(todo.progress) : status === TODO_STATUS.COMPLETED ? 100 : 0,
    remark: todo.remark || '',
    subtasks,
    auto: Boolean(todo.auto),
    autoCompletedId: todo.autoCompletedId || '',
    sourceGroup: todo.sourceGroup || inferSourceGroup(todo)
  }
}

function loadArray(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : fallback
  } catch (e) {
    return fallback
  }
}

function loadTodos() {
  return loadArray(STORAGE_KEY).map((todo) => normalizeTodo(todo))
}

function loadDeletedAutoIds() {
  return new Set(loadArray(DELETED_AUTO_KEY))
}

function loadTombstones() {
  return new Set(loadArray(TOMBSTONE_KEY))
}

function persistTodos(todos) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos.slice(0, MAX_STORAGE_TODOS)))
  } catch (e) {
    if (e?.name === 'QuotaExceededError') {
      console.error('[todo] localStorage容量不足，数据可能丢失')
    }
  }
}

function persistSet(key, setValue) {
  try {
    localStorage.setItem(key, JSON.stringify([...setValue]))
  } catch (e) {
    console.warn(`[todoStore] persist ${key} 澶辫触:`, e?.message || e)
  }
}

function calculateNextDueDate(currentDate, repeat) {
  if (!currentDate || !repeat || repeat === 'none') return null
  const d = new Date(currentDate)
  if (Number.isNaN(d.getTime())) return null
  switch (repeat) {
    case 'daily':
      d.setDate(d.getDate() + 1)
      break
    case 'weekly':
      d.setDate(d.getDate() + 7)
      break
    case 'monthly':
      d.setMonth(d.getMonth() + 1)
      break
    case 'yearly':
      d.setFullYear(d.getFullYear() + 1)
      break
    default:
      return null
  }
  return toLocalDateStr(d)
}

function makeAutoTodoId(prefix, sourceId) {
  return `${prefix}_${sourceId}`
}

function inferSourceGroup(todo = {}) {
  if (todo.source === 'workflow' || todo.type === 'workflow') return 'workflow'
  if (todo.source === 'inventory' || todo.type === 'stock') return 'warehouse'
  if (todo.source === 'quotations' || todo.source === 'contracts' || todo.source === 'transactions') return 'sales'
  if (todo.type === 'payment' || todo.type === 'receipt' || todo.type === 'finance') return 'finance'
  if (todo.source === 'notification') return 'notification'
  return todo.auto ? 'auto' : 'custom'
}

export const useTodoStore = defineStore('todo', () => {
  const todos = ref(loadTodos())
  const deletedAutoIds = ref(loadDeletedAutoIds())
  const tombstones = ref(loadTombstones())

  const today = computed(() => toLocalDateStr())

  function generateAutoTodos() {
    const result = []
    const todayStr = today.value

    const inventory = useInventoryStore().inventory || []
    inventory.forEach((item) => {
      const threshold = item.minStock || item.safetyStock || 10
      if (item.quantity <= threshold) {
        const critical = item.quantity <= threshold * 0.5
        result.push(
          normalizeTodo({
            id: makeAutoTodoId('auto_inv', item.id),
            title: `琛ヨ揣 ${item.name}锛堝簱瀛樹笉瓒筹級`,
            type: 'stock',
            priority: critical ? 'high' : 'medium',
            source: 'inventory',
            sourceId: item.id,
            status: TODO_STATUS.PENDING,
            dueDate: '',
            createdAt: todayStr,
            completedAt: null,
            notes: `搴撳瓨 ${item.quantity} / 瀹夊叏 ${threshold}`,
            auto: true
          })
        )
      }
    })

    const quotations = useQuotationStore().quotations || []
    quotations.forEach((q) => {
      if (q.status === 'pending') {
        result.push(
          normalizeTodo({
            id: makeAutoTodoId('auto_quo_pending', q.id),
            title: `瀹℃牳鎶ヤ环锟?${q.quotationNo || q.quoteNo || ''}`.trim(),
            type: 'review',
            priority: 'high',
            source: 'quotations',
            sourceId: q.id,
            status: TODO_STATUS.PENDING,
            dueDate: q.expiryDate || '',
            createdAt: q.createdAt || q.date || todayStr,
            completedAt: null,
            notes: `${q.customerName || ''} 楼${(q.amount || q.total || 0).toLocaleString()}`.trim(),
            auto: true
          })
        )
      }
    })

    const workflowStore = useWorkflowStore()
    const pendingTasks = workflowStore.pendingTasks || []
    pendingTasks.forEach((task) => {
      result.push(
        normalizeTodo({
          id: makeAutoTodoId('auto_wf', task.id),
          title: `${task.templateName || '瀹℃壒'} - ${task.businessNo || task.businessId || task.id}`.trim(),
          type: 'workflow',
          priority: 'high',
          source: 'workflow',
          sourceId: task.id,
          status: TODO_STATUS.PENDING,
          dueDate: '',
          createdAt: task.startTime || todayStr,
          completedAt: null,
          notes: `褰撳墠瀹℃壒浜猴細${task.currentApprover || ''}`.trim(),
          auto: true
        })
      )
    })

    const notificationStore = useNotificationStore()
    const todoNotifications = (notificationStore.notifications || []).filter(
      (item) => !item.read && item.type === NotificationType.TODO
    )
    todoNotifications.forEach((notification) => {
      result.push(
        normalizeTodo({
          id: makeAutoTodoId('auto_ntf', notification.id),
          title: notification.title || '寰呭姙鎻愰啋',
          type: 'notification',
          priority: notification.level === 'error' ? 'high' : 'medium',
          source: 'notification',
          sourceId: notification.id,
          status: TODO_STATUS.PENDING,
          dueDate: '',
          createdAt: notification.createTime || todayStr,
          completedAt: null,
          notes: notification.content || '',
          auto: true
        })
      )
    })

    return result
  }

  const allTodos = computed(() => {
    const manual = todos.value.filter((todo) => !todo.auto && !todo.autoCompletedId && !tombstones.value.has(todo.id))
    const auto = generateAutoTodos().filter((todo) => !deletedAutoIds.value.has(todo.id))
    return [...manual, ...auto].map((todo) => normalizeTodo(todo))
  })

  const stats = computed(() => {
    const list = allTodos.value
    const pending = list.filter((todo) => todo.status !== TODO_STATUS.COMPLETED)
    const completed = list.filter((todo) => todo.status === TODO_STATUS.COMPLETED)
    const overdue = pending.filter((todo) => todo.dueDate && todo.dueDate < today.value)
    return {
      total: list.length,
      pending: pending.length,
      completed: completed.length,
      overdue: overdue.length,
      auto: list.filter((todo) => todo.auto).length,
      manual: list.filter((todo) => !todo.auto).length
    }
  })

  const allTags = computed(() => {
    const tags = new Set()
    todos.value.forEach((todo) => {
      if (todo.tag) tags.add(todo.tag)
    })
    return [...tags].sort()
  })

  function addTodo(todo) {
    const newTodo = normalizeTodo({
      ...todo,
      createdBy: todo?.createdBy || getCurrentUser(),
      auto: false
    })
    todos.value.push(newTodo)
    persistTodos(todos.value)
    return newTodo
  }

  function updateTodo(id, updates) {
    const idx = todos.value.findIndex((todo) => todo.id === id)
    if (idx === -1) return
    todos.value[idx] = normalizeTodo({
      ...todos.value[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    })
    persistTodos(todos.value)
  }

  function toggleTodo(id, isAuto = false) {
    if (isAuto) {
      if (deletedAutoIds.value.has(id)) {
        deletedAutoIds.value.delete(id)
        persistSet(DELETED_AUTO_KEY, deletedAutoIds.value)
        return { action: 'restored', id }
      }
      deletedAutoIds.value.add(id)
      persistSet(DELETED_AUTO_KEY, deletedAutoIds.value)
      return { action: 'completed', id }
    }

    const todo = todos.value.find((item) => item.id === id)
    if (!todo) return null

    const now = new Date().toISOString()
    if (todo.status === TODO_STATUS.COMPLETED) {
      todo.status = TODO_STATUS.PENDING
      todo.completedAt = null
    } else {
      todo.status = TODO_STATUS.COMPLETED
      todo.completedAt = now
      todo.progress = 100
      if (todo.repeat && todo.repeat !== 'none') {
        const nextDue = calculateNextDueDate(todo.dueDate, todo.repeat)
        if (nextDue) {
          addTodo({
            ...todo,
            id: undefined,
            status: TODO_STATUS.PENDING,
            dueDate: nextDue,
            startDate: '',
            completedAt: null,
            createdAt: now,
            updatedAt: now,
            progress: 0,
            subtasks: (todo.subtasks || []).map((sub) => ({ ...sub, completed: false }))
          })
        }
      }
    }
    todo.updatedAt = now
    persistTodos(todos.value)
    return { action: todo.status === TODO_STATUS.COMPLETED ? 'completed' : 'restored', id }
  }

  function deleteTodo(id) {
    const todo = todos.value.find((item) => item.id === id)
    if (todo) {
      todos.value = todos.value.filter((item) => item.id !== id)
      tombstones.value.add(id)
      const syncEngine = useSyncEngine()
      syncEngine.recordDeletedId('todos', id)
      persistSet(TOMBSTONE_KEY, tombstones.value)
      persistTodos(todos.value)
      return
    }

    deletedAutoIds.value.add(id)
    persistSet(DELETED_AUTO_KEY, deletedAutoIds.value)
  }

  function batchComplete(ids) {
    const now = new Date().toISOString()
    ids.forEach((id) => {
      const todo = todos.value.find((item) => item.id === id)
      if (todo) {
        if (todo.status !== TODO_STATUS.COMPLETED) {
          todo.status = TODO_STATUS.COMPLETED
          todo.completedAt = now
          todo.progress = 100
          todo.updatedAt = now
        }
      } else {
        deletedAutoIds.value.add(id)
      }
    })
    persistTodos(todos.value)
    persistSet(DELETED_AUTO_KEY, deletedAutoIds.value)
  }

  function batchDelete(ids) {
    const syncEngine = useSyncEngine()
    ids.forEach((id) => {
      const todo = todos.value.find((item) => item.id === id)
      if (todo) {
        tombstones.value.add(id)
      } else {
        deletedAutoIds.value.add(id)
      }
    })
    todos.value = todos.value.filter((item) => !ids.includes(item.id))
    syncEngine.recordDeletedIds('todos', ids)
    persistSet(TOMBSTONE_KEY, tombstones.value)
    persistSet(DELETED_AUTO_KEY, deletedAutoIds.value)
    persistTodos(todos.value)
  }

  function clearCompleted() {
    const removedIds = todos.value.filter((todo) => todo.status === TODO_STATUS.COMPLETED).map((todo) => todo.id)
    removedIds.forEach((id) => tombstones.value.add(id))
    todos.value = todos.value.filter((todo) => todo.status !== TODO_STATUS.COMPLETED)
    persistSet(TOMBSTONE_KEY, tombstones.value)
    persistTodos(todos.value)
  }

  function completeAll() {
    const now = new Date().toISOString()
    todos.value.forEach((todo) => {
      if (todo.status !== TODO_STATUS.COMPLETED) {
        todo.status = TODO_STATUS.COMPLETED
        todo.completedAt = now
        todo.progress = 100
        todo.updatedAt = now
      }
    })
    generateAutoTodos().forEach((todo) => deletedAutoIds.value.add(todo.id))
    persistTodos(todos.value)
    persistSet(DELETED_AUTO_KEY, deletedAutoIds.value)
  }

  function toggleSubtask(todoId, subtaskId) {
    const todo = todos.value.find((item) => item.id === todoId)
    if (!todo || !Array.isArray(todo.subtasks)) return
    const subtask = todo.subtasks.find((item) => item.id === subtaskId)
    if (!subtask) return

    subtask.completed = !subtask.completed
    const completedCount = todo.subtasks.filter((item) => item.completed).length
    todo.progress = Math.round((completedCount / todo.subtasks.length) * 100)
    if (todo.progress === 100) {
      todo.status = TODO_STATUS.COMPLETED
      todo.completedAt = new Date().toISOString()
    }
    todo.updatedAt = new Date().toISOString()
    persistTodos(todos.value)
  }

  function initSeedData() {
    if (safeGetItem(INIT_KEY)) return
    const seed = [
      {
        id: 't1',
        title: '璺熻繘涓婃捣璐告槗鍚堝悓缁',
        type: 'followup',
        priority: 'high',
        status: TODO_STATUS.PENDING,
        dueDate: '2026-06-05',
        startDate: '2026-05-28',
        createdAt: '2026-05-28T09:00:00Z',
        notes: '合同即将到期，需尽快沟通续签事宜',
        tag: '鍟嗗姟',
        reminder: '提前3天',
        progress: 30,
        remark: '閲嶈瀹㈡埛',
        subtasks: [
          { id: 's1', title: '鍑嗗缁鏂规', completed: true },
          { id: 's2', title: '鑱旂郴瀹㈡埛纭', completed: false },
          { id: 's3', title: '娉曞姟瀹℃牳', completed: false }
        ]
      },
      {
        id: 't2',
        title: '鏁寸悊骞垮窞杩涘嚭鍙ｅ璐﹀崟',
        type: 'custom',
        priority: 'medium',
        status: TODO_STATUS.PENDING,
        dueDate: '2026-06-10',
        startDate: '',
        createdAt: '2026-05-29T10:00:00Z',
        notes: '5鏈堜唤瀵硅处鏁版嵁鏁寸悊',
        tag: '璐㈠姟',
        reminder: '提前1周',
        progress: 0,
        remark: ''
      },
      {
        id: 't3',
        title: '娣卞湷鏅洪€犳姤浠峰崟瀹℃牳',
        type: 'review',
        priority: 'high',
        status: TODO_STATUS.PENDING,
        dueDate: '2026-05-30',
        startDate: '2026-05-27',
        createdAt: '2026-05-27T14:00:00Z',
        notes: '瀹㈡埛鍌績灏藉揩鍥炲',
        tag: '鍟嗗姟',
        reminder: '提前1周',
        progress: 60,
        remark: '加急处理'
      },
      {
        id: 't4',
        title: '鏈堝害搴撳瓨鐩樼偣',
        type: 'stock',
        priority: 'low',
        status: TODO_STATUS.PENDING,
        dueDate: '2026-06-30',
        startDate: '2026-06-25',
        createdAt: '2026-05-30T08:00:00Z',
        notes: '鍏ㄤ粨鐩樼偣',
        tag: '杩愮淮',
        reminder: '提前1周',
        progress: 0,
        remark: ''
      },
      {
        id: 't5',
        title: '鍥炴鍌敹-姝︽眽閽㈣锤',
        type: 'payment',
        priority: 'high',
        status: TODO_STATUS.PENDING,
        dueDate: '2026-05-25',
        startDate: '2026-05-20',
        createdAt: '2026-05-20T11:00:00Z',
        notes: '閫炬湡鍥炴闇€鍌敹',
        tag: '璐㈠姟',
        reminder: '不提醒',
        progress: 10,
        remark: '客户回款'
      },
      {
        id: 't6',
        title: '鏂板憳宸RP绯荤粺鍩硅',
        type: 'custom',
        priority: 'medium',
        status: TODO_STATUS.COMPLETED,
        dueDate: '2026-05-28',
        startDate: '2026-05-26',
        createdAt: '2026-05-25T09:00:00Z',
        notes: '系统操作培训已完成',
        tag: '鍩硅',
        reminder: '不提醒',
        progress: 100,
        completedAt: '2026-05-28T16:00:00Z',
        remark: ''
      },
      {
        id: 't7',
        title: '渚涘簲鍟嗚祫璐ㄥ锟?娴欐睙鍖栧伐',
        type: 'approve',
        priority: 'medium',
        status: TODO_STATUS.PENDING,
        dueDate: '2026-06-08',
        startDate: '',
        createdAt: '2026-05-29T15:00:00Z',
        notes: '鏂颁緵搴斿晢鍑嗗叆瀹℃牳',
        tag: '鍟嗗姟',
        reminder: '提前2天',
        progress: 20,
        remark: ''
      },
      {
        id: 't8',
        title: '每日数据备份检查',
        type: 'custom',
        priority: 'low',
        status: TODO_STATUS.PENDING,
        dueDate: '2026-05-31',
        startDate: '',
        createdAt: '2026-05-30T08:00:00Z',
        notes: '检查自动备份是否正常',
        tag: '杩愮淮',
        reminder: '不提醒',
        progress: 0,
        repeat: 'daily',
        remark: ''
      }
    ]

    todos.value = seed.map((todo) => normalizeTodo(todo))
    persistTodos(todos.value)
    safeSetItem(INIT_KEY, '1')
  }

  function mergeRemoteItems(items) {
    if (!Array.isArray(items)) return
    const merged = mergeArrays(todos.value, items.map((todo) => normalizeTodo(todo)), 'id')
    todos.value = merged
      .map((todo) => normalizeTodo(todo))
      .filter((todo) => !tombstones.value.has(todo.id))
    persistTodos(todos.value)
  }

  function replaceData(newData) {
    todos.value = Array.isArray(newData)
      ? newData.map((todo) => normalizeTodo(todo)).filter((todo) => !tombstones.value.has(todo.id))
      : []
    persistTodos(todos.value)
  }

  return {
    todos,
    allTodos,
    stats,
    allTags,
    today,
    addTodo,
    updateTodo,
    toggleTodo,
    deleteTodo,
    batchComplete,
    batchDelete,
    clearCompleted,
    completeAll,
    toggleSubtask,
    initSeedData,
    replaceData,
    mergeRemoteItems,
    persist: (arg1, arg2) => {
      if (Array.isArray(arg1)) {
        persistTodos(arg1)
        return
      }
      if (Array.isArray(arg2)) {
        persistTodos(arg2)
        return
      }
      persistTodos(todos.value)
    },
    normalizeTodo
  }
})

