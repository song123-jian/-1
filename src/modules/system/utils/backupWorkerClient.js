let worker = null
let taskId = 0
const pendingTasks = new Map()

function getWorker() {
  if (worker) return worker

  worker = new Worker(new URL('../workers/backupWorker.js', import.meta.url), { type: 'module' })
  worker.onmessage = (event) => {
    const { id, success, json, result, error } = event.data || {}
    const task = pendingTasks.get(id)
    if (!task) return

    pendingTasks.delete(id)
    if (success) task.resolve(json ?? result)
    else task.reject(new Error(error || 'worker 任务失败'))
  }

  worker.onerror = (error) => {
    for (const [, task] of pendingTasks) {
      task.reject(error instanceof Error ? error : new Error('worker 错误'))
    }
    pendingTasks.clear()
  }

  return worker
}

export function runBackupWorkerTask(type, payload = {}) {
  return new Promise((resolve, reject) => {
    const id = ++taskId
    pendingTasks.set(id, { resolve, reject })
    getWorker().postMessage({ id, type, payload })
  })
}

export function destroyBackupWorker() {
  if (worker) {
    worker.terminate()
    worker = null
  }

  for (const [, task] of pendingTasks) {
    task.reject(new Error('worker 已销毁'))
  }
  pendingTasks.clear()
}
